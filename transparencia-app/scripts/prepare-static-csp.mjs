#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const rootArg = process.argv.find((argument) => argument.startsWith("--root="));
if (!rootArg) throw new Error("STATIC_CSP_ROOT_REQUIRED");
const root = path.resolve(rootArg.slice("--root=".length));
const sourceRoots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx"]);

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else if (extensions.has(path.extname(entry.name)) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) files.push(file);
  }
  return files;
}

function transformFile(file) {
  const sourceText = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let changed = false;
  const factory = ts.factory;
  const transformer = (context) => {
    const visit = (node) => {
      if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return ts.visitEachChild(node, visit, context);
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const attributes = [...opening.attributes.properties];
      const styleIndex = attributes.findIndex((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === "style");
      if (styleIndex === -1) return ts.visitEachChild(node, visit, context);
      const styleAttribute = attributes[styleIndex];
      if (!ts.isJsxAttribute(styleAttribute) || !styleAttribute.initializer || !ts.isJsxExpression(styleAttribute.initializer) || !styleAttribute.initializer.expression) {
        return ts.visitEachChild(node, visit, context);
      }
      const styleExpression = styleAttribute.initializer.expression;
      const styleCall = (name) => factory.createCallExpression(factory.createIdentifier(name), undefined, [styleExpression]);
      const generatedClass = styleCall("cspStyle");
      const dataExpression = styleCall("cspStyleData");
      const existingIndex = attributes.findIndex((attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === "className");
      const existing = existingIndex === -1 ? null : attributes[existingIndex];
      let existingExpression;
      if (existing && ts.isJsxAttribute(existing) && existing.initializer) {
        existingExpression = ts.isStringLiteral(existing.initializer)
          ? factory.createStringLiteral(existing.initializer.text)
          : ts.isJsxExpression(existing.initializer) && existing.initializer.expression
            ? existing.initializer.expression
            : factory.createStringLiteral("");
      } else {
        existingExpression = factory.createStringLiteral("");
      }
      const classAttribute = factory.createJsxAttribute(
        factory.createIdentifier("className"),
        factory.createJsxExpression(undefined, factory.createCallExpression(factory.createIdentifier("cspClassName"), undefined, [existingExpression, generatedClass]))
      );
      const dataAttribute = factory.createJsxAttribute(factory.createIdentifier("data-csp-style"), factory.createJsxExpression(undefined, dataExpression));
      const nextAttributes = attributes.filter((_, index) => index !== styleIndex && index !== existingIndex);
      nextAttributes.push(classAttribute, dataAttribute);
      const nextOpening = ts.isJsxElement(node)
        ? factory.updateJsxOpeningElement(opening, opening.tagName, opening.typeArguments, factory.createJsxAttributes(nextAttributes))
        : factory.updateJsxSelfClosingElement(opening, opening.tagName, opening.typeArguments, factory.createJsxAttributes(nextAttributes));
      changed = true;
      const updated = ts.isJsxElement(node)
        ? factory.updateJsxElement(node, nextOpening, node.children, node.closingElement)
        : nextOpening;
      return ts.visitEachChild(updated, visit, context);
    };
    return (node) => ts.visitNode(node, visit);
  };
  const transformed = ts.transform(sourceFile, [transformer]).transformed[0];
  if (!changed) return false;
  let printed = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(transformed);
  if (!printed.includes("from \"@/lib/csp-styles\"") && !printed.includes("from '@/lib/csp-styles'")) {
    const importStatement = 'import { cspClassName, cspStyle, cspStyleData } from "@/lib/csp-styles";\n';
    const directive = printed.match(/^(?:\uFEFF?['\"]use [^'\"]+['\"];?\s*\n)+/);
    printed = directive ? `${directive[0]}${importStatement}${printed.slice(directive[0].length)}` : importStatement + printed;
  }
  writeFileSync(file, printed, "utf8");
  return true;
}

let changedFiles = 0;
let transformedStyles = 0;
for (const sourceRoot of sourceRoots) {
  const directory = path.join(root, sourceRoot);
  for (const file of await filesUnder(directory)) {
    const before = readFileSync(file, "utf8");
    const count = (before.match(/\bstyle\s*=\s*\{/g) || []).length;
    if (transformFile(file)) {
      changedFiles += 1;
      transformedStyles += count;
    }
  }
}
console.log(`[static-csp] archivos transformados: ${changedFiles}; estilos transformados: ${transformedStyles}`);
