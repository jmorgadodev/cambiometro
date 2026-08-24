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
    expect(workflow).toContain("wrangler dev --local --config workers/public-api/wrangler.jsonc --port 8788");
    expect(workflow).toContain("wrangler pages dev out --port 3003");
    expect(workflow).not.toContain("npm run start -- -p 3003");
  });

  it("define staging de solo lectura con el Worker separado y la D1 autorizada", () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "workers", "public-api", "wrangler.jsonc"), "utf8"));
    const staging = config.env.staging;

    expect(staging.name).toBe("cambiometro-staging");
    expect(staging.workers_dev).toBe(true);
    expect(staging.routes).toEqual([]);
    // C1: staging aislado local-only con ID cero, no debe igualar prod
    expect(staging.d1_databases[0].database_id).toBe("00000000-0000-0000-0000-000000000000");
    expect(staging.d1_databases[0].database_name).toBe("transparencia-db-staging-LOCAL");
    expect(staging.d1_databases[0].database_id).not.toBe(config.d1_databases[0].database_id);
    expect(staging.r2_buckets).toEqual(config.r2_buckets);
  });

  it("no incluye escrituras D1 fuera del canal Ley 21.715 en el Worker web", () => {
    // ADR-0013: única excepción de escritura en el bundle web = canal de
    // solicitudes Ley 21.715 y eventos de seguridad. El resto sigue siendo
    // solo lectura conforme a ADR-0011.
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

    const allowedWriteTables = new Set(["data_requests", "security_events", "request_rate_events"]);
    const dml = /\b(?:insert\s+(?:or\s+replace\s+)?into|replace\s+into|update\s+[a-z_][a-z0-9_]*\s+set|delete\s+from)\s+([a-z_][a-z0-9_]*)/gi;
    const writable = runtimeFiles.filter((file) => {
      const content = fs.readFileSync(file, "utf8");
      let match;
      while ((match = dml.exec(content)) !== null) {
        if (!allowedWriteTables.has(match[1].toLowerCase())) return true;
      }
      return false;
    });
    expect(writable).toEqual([]);
  });
});
