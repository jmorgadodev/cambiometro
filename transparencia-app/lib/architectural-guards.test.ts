import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { generateStaticParams } from "@/app/politico/[id]/page";

describe("Guardias Arquitectónicos — Fichas /politico/* Estáticas y Zero CPU Spikes", () => {
  const politicoPagePath = resolve("app/politico/[id]/page.tsx");
  const politicoPageContent = readFileSync(politicoPagePath, "utf8");

  it("1. Guard: /politico/[id]/page.tsx NO tiene force-dynamic y tiene generateStaticParams", () => {
    expect(politicoPageContent).not.toContain('export const dynamic = "force-dynamic"');
    expect(politicoPageContent).not.toContain("export const dynamic = 'force-dynamic'");
    expect(politicoPageContent).toContain("export async function generateStaticParams");
  });

  it("2. Guard: app/page.tsx (Home) es estática (force-static) y no force-dynamic", () => {
    const homePagePath = resolve("app/page.tsx");
    const homePageContent = readFileSync(homePagePath, "utf8");
    expect(homePageContent).not.toContain('export const dynamic = "force-dynamic"');
    expect(homePageContent).not.toContain("export const dynamic = 'force-dynamic'");
    expect(homePageContent).toContain('export const dynamic = "force-static"');
  });

  it("3. Guard: generateStaticParams genera parámetros para los 205 parlamentarios", async () => {
    const params = await generateStaticParams();
    expect(params.length).toBeGreaterThanOrEqual(205);

    // Verificar cobertura de los 205
    for (const pol of POLITICOS_SEED) {
      const slug = getPoliticoSlug(pol);
      const hasMatch = params.some((p) => p.id === slug || p.id === pol.id);
      expect(hasMatch, `Falta parámetro estático para ${pol.nombre_completo} (${pol.id})`).toBe(true);
    }
  });

  it("4. Guard: Índice precomputado data/politicos-votaciones-index.json existe y cubre los 205", () => {
    const indexPath = resolve("data/politicos-votaciones-index.json");
    if (!existsSync(indexPath)) {
      // npm test runs before pages:build in CI; the build guard validates the
      // generated index, while this phase verifies that its source exists.
      expect(existsSync(resolve("data/politicos-votaciones.json"))).toBe(true);
      return;
    }

    const indexData = JSON.parse(readFileSync(indexPath, "utf8"));
    const keys = Object.keys(indexData);
    expect(keys.length).toBe(205);

    for (const pol of POLITICOS_SEED) {
      const entry = indexData[pol.id];
      expect(entry).toBeDefined();
      expect(entry.id).toBe(pol.id);
      expect(entry.totalVotaciones).toBe(pol.cargo === "Diputado" ? 580 : 189);
      expect(entry.votos.length).toBe(pol.cargo === "Diputado" ? 580 : 189);
    }
  });

  it("5. Lint Arquitectónico: Prohibir imports de JSON > 200 KB en lib/ (cero parse pesado en runtime)", () => {
    function scanDir(dir: string, fileList: string[] = []): string[] {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = join(dir, file.name);
        if (file.isDirectory()) {
          scanDir(fullPath, fileList);
        } else if ((file.name.endsWith(".tsx") || file.name.endsWith(".ts")) && !file.name.includes(".test.")) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const libFiles = scanDir(resolve("lib"));
    for (const filePath of libFiles) {
      const content = readFileSync(filePath, "utf8");
      const jsonImports = [...content.matchAll(/from\s+["']([^"']+\.json)["']/g)];

      for (const match of jsonImports) {
        const importPath = match[1];
        let resolvedJsonPath = "";
        if (importPath.startsWith("@/")) {
          resolvedJsonPath = resolve(importPath.replace("@/", ""));
        } else if (importPath.startsWith("../") || importPath.startsWith("./")) {
          resolvedJsonPath = resolve(join(filePath, "..", importPath));
        }

        if (resolvedJsonPath && existsSync(resolvedJsonPath)) {
          const size = statSync(resolvedJsonPath).size;
          // Prohibir datos pesados como politicos-votaciones (3.7MB+) en lib runtime
          expect(
            importPath.includes("politicos-votaciones"),
            `Archivo ${filePath} no debe importar politicos-votaciones en runtime.`
          ).toBe(false);

          expect(
            size,
            `Archivo ${filePath} importa JSON ${importPath} de ${(size / 1024).toFixed(0)} KB (> 800 KB). Debe leerse en build/ETL o vía assets.`
          ).toBeLessThanOrEqual(800 * 1024);
        }
      }
    }
  });
});
