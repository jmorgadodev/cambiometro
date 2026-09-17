import { gunzipSync } from "node:zlib";
import { describe, it, expect } from "vitest";
import { buildLakePlan } from "../scripts/etl/lake.mjs";
import { assertCatalogReferencesAvailable } from "./r2-catalog-audit.mjs";
import { planR2Publication } from "../scripts/etl/r2.mjs";

const snapshot = (sources: Parameters<typeof buildLakePlan>[0]["fuentes"]) => ({ actualizado_en: "2026-09-17T12:00:00Z", fuentes: sources });
const records = (plan: ReturnType<typeof buildLakePlan>) => plan.assets.filter(asset => asset.key.includes("/records-") && asset.key.endsWith(".gz")).flatMap(asset => gunzipSync(asset.data).toString("utf8").trim().split("\n").map(line => JSON.parse(line)));

describe("publicación independiente e incremental", () => {
  it("rechaza una fuente seleccionada ausente o vacía sin publicar ceros", () => {
    expect(() => buildLakePlan(snapshot({ infolobby: [] }), { sourceKeys: ["infolobby"] })).toThrow("SOURCE_PUBLICATION_EMPTY");
    expect(() => buildLakePlan(snapshot({ "ley-19862": [{ id: "t1" }] }), { sourceKeys: ["ley_19862"] })).toThrow("SOURCE_PUBLICATION_EMPTY");
  });
  it("no genera datos ajenos y conserva exactamente sus metadatos", () => {
    const previous = buildLakePlan(snapshot({ contraloria: [{ id: "c1", fecha: "2026-08-02", url: "https://contraloria.cl/c1" }] }));
    const plan = buildLakePlan(snapshot({ votaciones_senado: [{ id: "v1", fecha: "2026-09-12" }], contraloria: [{ id: "basura", fecha: "2026-09-17" }] }), { existingCatalog: previous.catalog, sourceKeys: ["votaciones_senado"] });
    expect(records(plan).map(row => row.sourceId)).toEqual(["votaciones_senado"]);
    expect(plan.catalog.sources.find(source => source.id === "contraloria")).toEqual(previous.catalog.sources.find(source => source.id === "contraloria"));
    expect(plan.assets.some(asset => /partitions\/contraloria\//.test(asset.key))).toBe(false);
  });
  it("mantiene los eventos anteriores del mes y aplica la corrección por ID", () => {
    const previous = buildLakePlan(snapshot({ votaciones_senado: [{ id: "v1", fecha: "2026-09-01", titulo: "anterior" }, { id: "v2", fecha: "2026-09-03" }] }));
    const original = records(previous);
    const plan = buildLakePlan(snapshot({ votaciones_senado: [{ id: "v1", fecha: "2026-09-01", titulo: "corregido" }, { id: "v3", fecha: "2026-09-17" }] }), { existingCatalog: previous.catalog, existingPartitionRecords: { "votaciones_senado/2026/09": original } });
    const rows = records(plan);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map(row => row.id)).size).toBe(3);
    expect(rows.find(row => row.id === original[0].id)?.data.titulo).toBe("corregido");
    expect(rows.some(row => row.id === original[1].id)).toBe(true);
  });
  it("no autoriza una referencia ausente nueva o modificada", () => {
    const old = { id: "vieja", sourceId: "senado", period: "2026-05", manifestKey: "ausente", recordCount: 10, checksumSha256: "old" };
    const previous = { partitions: [old] };
    expect(() => assertCatalogReferencesAvailable(previous, new Set(), previous)).not.toThrow();
    expect(() => assertCatalogReferencesAvailable({ partitions: [{ ...old, recordCount: 11 }] }, new Set(), previous)).toThrow("R2_CATALOG_ORPHANED_PARTITIONS");
    expect(() => assertCatalogReferencesAvailable({ partitions: [old, { ...old, id: "nueva", manifestKey: "nueva" }] }, new Set(), previous)).toThrow("R2_CATALOG_ORPHANED_PARTITIONS");
  });
  it("publica todos los meses nuevos declarados y conserva históricos existentes", () => {
    const plan = buildLakePlan(snapshot({ votaciones_senado: [{ id: "v1", fecha: "2026-08-12" }, { id: "v2", fecha: "2026-09-17" }] }));
    const publication = planR2Publication(plan.assets, { objects: [{ key: "partitions/otra/2020/01/records.gz", size: 8_100, checksumSha256: "old" }] }, 20_000);
    expect(publication.deletes).toEqual([]);
    expect(publication.puts.filter(asset => asset.key.includes("/records-")).length).toBe(2);
    expect(publication.puts.at(-1)?.key).toBe("catalog/v1/manifest.json");
  });
});
