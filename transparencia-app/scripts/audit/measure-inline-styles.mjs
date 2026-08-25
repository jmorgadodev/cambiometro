#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx"]);
const maxExamples = process.argv.includes("--all") ? Number.POSITIVE_INFINITY : 12;
const result = {
  files: 0,
  styleAttributes: 0,
  objectLiterals: 0,
  staticallyExtractable: 0,
  dynamicObjectLiterals: 0,
  nonObjectExpressions: 0,
  dynamicProperties: 0,
  examples: [],
};

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else if (extensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function isLiteral(node) {
  if (!node) return false;
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return ts.isNumericLiteral(node.operand);
  if (ts.isConditionalExpression(node)) return isLiteral(node.whenTrue) && isLiteral(node.whenFalse);
  return false;
}

function inspectStyle(expression) {
  if (!ts.isObjectLiteralExpression(expression)) return { kind: "non-object" };
  let dynamicProperties = 0;
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property) || !isLiteral(property.initializer)) dynamicProperties += 1;
  }
  return { kind: dynamicProperties === 0 ? "static" : "dynamic", dynamicProperties };
}

for (const sourceRoot of sourceRoots) {
  const directory = path.join(root, sourceRoot);
  for (const file of await filesUnder(directory)) {
    result.files += 1;
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === "style") {
        result.styleAttributes += 1;
        const expression = node.initializer?.expression;
        const inspected = inspectStyle(expression);
        if (inspected.kind === "static") {
          result.objectLiterals += 1;
          result.staticallyExtractable += 1;
        } else if (inspected.kind === "dynamic") {
          result.objectLiterals += 1;
          result.dynamicObjectLiterals += 1;
          result.dynamicProperties += inspected.dynamicProperties;
        } else {
          result.nonObjectExpressions += 1;
        }
        if (result.examples.length < maxExamples && inspected.kind !== "static") {
          result.examples.push({ file: path.relative(root, file).replaceAll("\\", "/"), source: node.getText(source).slice(0, 240) });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

console.log(JSON.stringify(result, null, 2));
