import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { canonicalizeLakeRecord, entityFromRosterMember, relationsFromLakeRecord, selectMaterializedPartitions, sourceStateChecksum } from "../scripts/etl/materialize.mjs";

const lakeRecord = {
  id: "camara-vote-100-7",
  kind: "vote",
  sourceId: "camara",
  occurredAt: "2026-08-12",
  evidence: { sourceUrl: "https://opendata.camara.cl/vote/100" },
  data: {
    title: "Votacion 100",
    description: "Sala",
    subject_entity_ids: ["person-7"],
    object_entity_ids: ["public-body-camara"],
    relations: [{ fromId: "person-7", predicate: "voted_in", toId: "public-body-camara", method: "official_id" }],
    entities: [{ id: "person-7" }],
    declaracion: { payload: "demasiado grande para D1" },
    opcion: "A Favor",
    monto_clp: 1_250_000,
    items: [{ id: "1", description: "Detalle que permanece íntegro en R2" }],
    documents: [{ id: "doc-1", url: "https://official.test/doc-1" }],
    votos: [{ id: "person-7", opcion: "A Favor" }],
    buyer: { id: "buyer-1", name: "Organismo duplicado" },
    suppliers: [{ id: "supplier-1", name: "Proveedor duplicado" }],
  },
};

describe("materializacion del lake a D1", () => {
  it("convierte la nomina oficial en entidades consultables", () => {
    expect(entityFromRosterMember({ entityId: "person-senado-1110", name: "Pedro Araya Guerrero", chamber: "senado", evidenceUrl: "https://senado.cl/1110" })).toMatchObject({
      id: "person-senado-1110",
      kind: "person",
      identifiers: [{ scheme: "senado-id", value: "1110" }],
      attributes: { chamber: "senado" },
    });
  });

  it("delega la atomicidad al batch D1 sin transacciones SQL explicitas", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).not.toMatch(/`BEGIN;|\nBEGIN;|\nCOMMIT;/);
  });

  it("usa la configuracion del Worker para operaciones D1 y R2 remotas", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain('const wranglerConfig = resolve("workers/public-api/wrangler.jsonc")');
    expect(script).toContain('[wranglerBin, "--config", wranglerConfig, ...args]');
  });

  it("limpia staging si una importación falla antes de activar la fuente", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain("DELETE FROM stage_entities WHERE run_id=${sql(runId)}");
    expect(script).toContain("DELETE FROM stage_records WHERE run_id=${sql(runId)}");
    expect(script).toContain("DELETE FROM stage_relations WHERE run_id=${sql(runId)}");
    expect(script).toContain("--stage-batch");
  });

  it("conserva relaciones oficiales sin duplicar las derivables desde sujetos y objetos", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain("json_each(stage_records.subject_entity_ids_json)");
    expect(script).toContain("source_id IS NULL LIMIT 10000");
    expect(script).toContain("DELETE FROM relations WHERE source_id=");
    expect(script).not.toContain("SELECT 'rel-' || stage_records.id");
  });

  it("publica las entidades descubiertas dentro de los registros antes de activar la fuente", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    const finalizeSource = script.slice(script.indexOf("function finalizeSource"));
    const entityPublish = finalizeSource.indexOf("INSERT OR REPLACE INTO entities");
    const recordPublish = finalizeSource.indexOf("INSERT INTO records");

    expect(entityPublish).toBeGreaterThan(-1);
    expect(recordPublish).toBeGreaterThan(-1);
    expect(entityPublish).toBeLessThan(recordPublish);
  });

  it("bloquea una fuente si el staging contiene sujetos u objetos sin entidad", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain("D1_ORPHAN_ENTITY_REFERENCES");
  });

  it("pagina la lectura de personas para no exceder el limite de respuesta D1", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain("function queryRowsPaged");
    expect(script).toContain("LIMIT ${pageSize} OFFSET ${offset}");
    expect(script).toContain("queryRowsPaged(`SELECT id,kind,name,source_ids_json FROM entities");
  });

  it("reemplaza los alias en el mismo batch transaccional", () => {
    const script = readFileSync(resolve("scripts/materialize-d1.mjs"), "utf8");
    expect(script).toContain("writer.add(\"DELETE FROM entity_aliases WHERE source_id='infoprobidad';\")");
    expect(script).not.toContain('executeSql("DELETE FROM entity_aliases');
  });

  it("muestra ayuda sin iniciar una materializacion", () => {
    const result = spawnSync(process.execPath, ["scripts/materialize-d1.mjs", "--help"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--dry-run");
    expect(result.stdout).toContain("--sources");
  });

  it("normaliza el registro y excluye payloads masivos", () => {
    const record = canonicalizeLakeRecord(lakeRecord);
    expect(record).toMatchObject({
      id: "camara-vote-100-7",
      sourceId: "camara",
      title: "Votacion 100",
      subjectEntityIds: ["person-7"],
      objectEntityIds: ["public-body-camara"],
    });
    expect(record.amount).toEqual({ value: 1_250_000, currency: "CLP", unit: "pesos" });
    expect(record.data).toEqual({ opcion: "A Favor", items_count: 1, documents_count: 1, votos_count: 1 });
  });

  it("mantiene el histórico completo en R2 y sólo el período DIPRES más reciente en D1", () => {
    const partitions = [
      { id: "dipres/2026/04", sourceId: "dipres", period: "2026-04" },
      { id: "dipres/2026/06", sourceId: "dipres", period: "2026-06" },
      { id: "dipres/2026/05", sourceId: "dipres", period: "2026-05" },
      { id: "chilecompra/2026/06", sourceId: "chilecompra", period: "2026-06" },
      { id: "servel/2025/11", sourceId: "servel", period: "2025-11" },
    ];

    expect(selectMaterializedPartitions(partitions).map((partition: { id: string }) => partition.id)).toEqual([
      "dipres/2026/06",
      "chilecompra/2026/06",
    ]);
    expect(selectMaterializedPartitions(partitions, { includeAllHistory: true })).toEqual(partitions);
  });

  it("genera relaciones deterministas vinculadas a la evidencia", () => {
    const first = relationsFromLakeRecord(lakeRecord);
    const second = relationsFromLakeRecord(lakeRecord);
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      fromId: "person-7",
      predicate: "voted_in",
      toId: "public-body-camara",
      evidenceRecordIds: ["camara-vote-100-7"],
    });
  });

  it("deriva un checksum de fuente cuando el catalogo solo trae checksums por particion", () => {
    const source = { id: "infolobby", recordCount: 2 };
    const partitions = [
      { id: "infolobby/2026/08", sourceId: "infolobby", checksumSha256: "b" },
      { id: "infolobby/2026/07", sourceId: "infolobby", checksumSha256: "a" },
    ];
    const checksum = sourceStateChecksum(source, partitions);

    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum).toBe(sourceStateChecksum(source, [...partitions].reverse()));
  });
});
