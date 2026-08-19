import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("validación runtime de despliegue", () => {
  it("prueba el Worker con D1 local en lugar de next start", () => {
    const workflow = fs.readFileSync(
      path.resolve(process.cwd(), "..", ".github", "workflows", "build-e2e.yml"),
      "utf8",
    );

    expect(workflow).toContain("wrangler d1 migrations apply transparencia-db --local");
    expect(workflow).toContain("fixtures/d1-browser.sql");
    expect(workflow).toContain("wrangler dev --local --port 3003");
    expect(workflow).not.toContain("npm run start -- -p 3003");
  });

  it("define staging de solo lectura con el Worker separado y la D1 autorizada", () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "wrangler.jsonc"), "utf8"));
    const staging = config.env.staging;

    expect(staging.name).toBe("cambiometro-staging");
    expect(staging.workers_dev).toBe(true);
    expect(staging.routes).toEqual([]);
    expect(staging.d1_databases).toEqual(config.d1_databases);
    expect(staging.r2_buckets).toEqual(config.r2_buckets);
  });

  it("no incluye escrituras D1 en las rutas del Worker web", () => {
    const runtimeFiles: string[] = [];
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(target);
        else if (/\.(?:ts|tsx|mjs)$/.test(entry.name) && !entry.name.includes(".test.")) runtimeFiles.push(target);
      }
    };
    visit(path.resolve(process.cwd(), "app"));
    visit(path.resolve(process.cwd(), "lib"));

    const dml = /\b(?:insert\s+(?:or\s+replace\s+)?into|replace\s+into|update\s+[a-z_][a-z0-9_]*\s+set|delete\s+from)\b/i;
    const writable = runtimeFiles.filter((file) => dml.test(fs.readFileSync(file, "utf8")));
    expect(writable).toEqual([]);
  });
});
