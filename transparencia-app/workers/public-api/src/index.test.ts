import { describe, expect, it } from "vitest";
import worker, { type Env } from "./index";

function database(options: {
  hasTransferRows?: boolean;
  transferTotal?: number;
  officials?: Array<Record<string, unknown>>;
}) {
  const transferRows = options.hasTransferRows === false ? [] : [{ ok: 1 }];
  const officials = options.officials ?? [];
  return {
    prepare(sql: string) {
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          if (sql.includes("SELECT 1 AS ok FROM transferencias_19862")) return transferRows[0] ?? null;
          if (sql.includes("COUNT(*) AS total")) return { total: options.transferTotal ?? 0 };
          return null;
        },
        async all() {
          if (sql.includes("FROM funcionarios_publicos")) return { results: officials };
          if (sql.includes("FROM entities")) return { results: [] };
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

function bucket(objects: Record<string, unknown>) {
  return {
    async get(key: string) {
      const value = objects[key];
      if (value === undefined) return null;
      return {
        async json<T>() {
          return value as T;
        },
      };
    },
  };
}

describe("public-api Worker", () => {
  it("no fabrica el universo de transferencias cuando D1 está vacío", async () => {
    const env = { DB: database({ hasTransferRows: false }) } as unknown as Env;
    const response = await worker.fetch(new Request("https://example.test/api/v1/transferencias?page=1&limit=10"), env);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "DATASET_UNAVAILABLE" } });
  });

  it("preserva búsqueda de funcionarios aunque el índice canónico aún no esté disponible", async () => {
    const env = {
      DB: database({
        officials: [{
          id: "func-1",
          nombre_completo: "Jorge Funcionario",
          cargo: "Profesional",
          organo_id: "muni-maipu",
          estamento: "Profesional",
          tipo_contrato: "Planta",
          remuneracion_bruta_mensual: 1000000,
        }],
      }),
    } as unknown as Env;
    const response = await worker.fetch(new Request("https://example.test/api/v1/search?q=Jorge"), env);
    const payload = await response.json() as { data: { funcionarios: Array<{ nombre: string }> } };
    expect(response.status).toBe(200);
    expect(payload.data.funcionarios[0]?.nombre).toBe("Jorge Funcionario");
  });

  it("sirve la nómina municipal desde R2 cuando D1 aún no está materializada", async () => {
    const env = {
      PUBLIC_DATA: bucket({
        "projections/funcionarios-v1/manifest.json": {
          version: "2026-06",
          generatedAt: "2026-06-30T00:00:00.000Z",
          assets: [{ key: "projections/funcionarios-v1/versions/2026-06/muni-maipu.json" }],
          coverage: [{ communeId: "muni-maipu", administrationId: "muni-maipu", status: "available" }],
        },
        "projections/funcionarios-v1/versions/2026-06/muni-maipu.json": [
          {
            id: "func-1",
            nombre_completo: "Ana Maipú",
            cargo: "Profesional",
            estamento: "Profesional",
            tipo_contrato: "Planta",
            remuneracion_bruta_mensual: 1000000,
            fuente_periodo: "2026-06",
          },
          {
            id: "func-2",
            nombre_completo: "Bruno Maipú",
            cargo: "Administrativo",
            estamento: "Administrativo",
            tipo_contrato: "Contrata",
            remuneracion_bruta_mensual: 900000,
            fuente_periodo: "2026-06",
          },
        ],
      }),
    } as unknown as Env;

    const response = await worker.fetch(new Request("https://example.test/api/funcionarios?muni=muni-maipu&periodo=2026-06&limit=1"), env);
    const payload = await response.json() as { data: Array<{ id: string }>; meta: { total: number; sourceStatus: string } };
    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]?.id).toBe("func-1");
    expect(payload.meta.total).toBe(2);
    expect(payload.meta.sourceStatus).toBe("available");
  });

  it("conserva los contratos de API separados sin importar datasets de páginas", async () => {
    const env = { DB: database({ hasTransferRows: false }) } as unknown as Env;
    const routes = [
      "/api/v1/sources",
      "/api/v1/records?source=camara",
      "/api/v1/relations?entity_id=person-test-1",
      "/api/v1/crosses?entity_id=person-test-1",
      "/api/v1/alertas",
      "/api/directorio",
      "/api/v1/export?format=json&limit=1",
      "/api/v1/health/data",
      "/api/og/site",
    ];
    for (const route of routes) {
      const response = await worker.fetch(new Request(`https://example.test${route}`), env);
      expect(response.status).not.toBe(404);
    }
  });

  it("no expone identificadores ni versiones internas en salud de datos", async () => {
    const env = { DB: database({ hasTransferRows: false }) } as unknown as Env;
    const response = await worker.fetch(new Request("https://example.test/api/v1/health/data"), env);
    const text = await response.text();
    expect(text).not.toContain("publishedVersion");
    expect(text).not.toContain('"id":"run-');
    expect(text).toContain('"latestRun"');
  });
});
