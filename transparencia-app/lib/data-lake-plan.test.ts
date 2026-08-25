import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildLakePlan } from "../scripts/etl/lake.mjs";

const recordAsset = (plan: ReturnType<typeof buildLakePlan>, prefix: string) => plan.assets.find((asset) => asset.key.startsWith(`${prefix}/records-`) && asset.key.endsWith(".jsonl.gz"));
const entityAsset = (plan: ReturnType<typeof buildLakePlan>, sourceId: string) => plan.assets.find((asset) => asset.key.startsWith(`entities/v1/${sourceId}-`) && asset.key.endsWith(".jsonl.gz"));
const entityIndexAsset = (plan: ReturnType<typeof buildLakePlan>, sourceId: string) => plan.assets.find((asset) => asset.key.startsWith(`indexes/v1/${sourceId}/entities-`) && asset.key.endsWith(".jsonl.gz"));

describe("plan de publicación del lago estático", () => {
  it("rechaza IDs duplicados antes de construir manifiestos o relaciones", () => {
    expect(() => buildLakePlan({ actualizado_en: "2026-08-08T00:00:00Z", fuentes: {
      chilecompra: [
        { id: "repetido", fecha: "2026-06-01", url: "https://api.mercadopublico.cl/1" },
        { id: "repetido", fecha: "2026-06-02", url: "https://api.mercadopublico.cl/2" },
      ],
    } })).toThrow("DUPLICATE_SOURCE_RECORD_ID: chilecompra:repetido");
  });

  it("agrupa por fuente/año/mes y produce assets versionados para Releases y R2", () => {
    const snapshot = {
      actualizado_en: "2026-08-08T12:00:00.000Z",
      fuentes: {
        infolobby: [
          { id: "aud-2", fecha: "2026-08-02", url: "https://official.test/2", materia: "B" },
          { id: "aud-1", fecha: "2026-07-31", url: "https://official.test/1", materia: "A" },
        ],
        congreso_opendata: [{ id: "843", nombre: "Diputada", url: "https://official.test/camara" }],
      },
    };

    const plan = buildLakePlan(snapshot, { maxPartBytes: 1_900_000_000 });

    expect(plan.catalog.schemaVersion).toBe("1.0.0");
    expect(plan.catalog.partitions.map((partition: { id: string }) => partition.id)).toEqual([
      "camara/2026/08",
      "infolobby/2026/07",
      "infolobby/2026/08",
    ]);
    expect(plan.catalog.partitions[1].releaseTag).toMatch(/^data-infolobby-2026-[a-f0-9]{16}$/);
    expect(plan.assets.some((asset: { key: string }) => asset.key === "catalog/v1/manifest.json")).toBe(true);
    expect(plan.assets.every((asset: { checksumSha256: string }) => /^[a-f0-9]{64}$/.test(asset.checksumSha256))).toBe(true);

    const projection = plan.assets.find((asset: { key: string }) => asset.key.includes("/records-") && asset.key.endsWith(".jsonl.gz"));
    expect(projection).toBeDefined();
    if (!projection) throw new Error("No se generó la proyección comprimida");
    expect(gunzipSync(projection.data).toString("utf8")).toContain('"sourceId"');
  });

  it("divide una proyección grande con nombres de parte estables", () => {
    const snapshot = {
      actualizado_en: "2026-08-08T12:00:00.000Z",
      fuentes: {
        infoprobidad: Array.from({ length: 5 }, (_, index) => ({
          id: `declaracion-${index}`,
          fecha: "2026-08-01",
          nombre: `Persona ${index}`,
          url: `https://official.test/${index}`,
        })),
      },
    };

    const plan = buildLakePlan(snapshot, { maxPartBytes: 80 });
    const parts = plan.assets.filter((asset: { key: string }) => /\/records-[a-f0-9]{64}\.jsonl\.gz\.part-\d{4}$/.test(asset.key));

    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]?.key).toMatch(/part-0001$/);
    expect(parts.at(-1)?.key).toMatch(/part-\d{4}$/);
  });

  it("publica inventarios oficiales aunque todavía no existan registros normalizados", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-08-08T00:00:00Z", fuentes: {} }, {
      sourceInventory: {
        generatedAt: "2026-08-08T00:00:00Z",
        sources: [{ id: "dipres", status: "partial", periods: ["2025", "2026"], assetCount: 2, assets: [{ url: "https://dipres.gob.cl/real.csv" }], indexChecksumSha256: "abc" }],
      },
      sourceMetadata: { dipres: { coverage: { expected: ["2025", "2026"] }, license: "Datos públicos", notes: "Cobertura inventariada" } },
    });
    expect(plan.catalog.sources[0]).toMatchObject({ id: "dipres", status: "partial", foundPeriods: ["2025", "2026"], recordCount: 0 });
    const sourceManifest = plan.assets.find((asset: { key: string }) => asset.key === "sources/dipres/manifest.json");
    expect(sourceManifest).toBeDefined();
    expect(JSON.parse(sourceManifest!.data.toString("utf8"))).toMatchObject({
      sourceId: "dipres", status: "partial", foundPeriods: ["2025", "2026"], partitionCount: 0,
      recordCount: 0, recordErrorCount: 0, entityCount: 0, partitions: [], generatedAt: "2026-08-08T00:00:00Z",
      coverage: { expected: ["2025", "2026"] }, license: "Datos públicos", notes: "Cobertura inventariada",
    });
  });

  it("archiva originales redistribuibles y los enlaza desde el manifiesto de partición", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-06-30T00:00:00Z", fuentes: { dipres: [{ id: "d-1", fecha: "2026-06-01", url: "https://dipres.gob.cl/real.csv" }] } }, {
      originalAssets: [{ sourceId: "dipres", year: 2026, month: 6, name: "original.csv", url: "https://dipres.gob.cl/real.csv", data: Buffer.from("real"), license: "datos públicos", redistributable: true }],
    });
    expect(plan.assets.some((asset: { key: string }) => asset.key === "originals/dipres/2026/06/original.csv")).toBe(true);
    const manifest = plan.assets.find((asset: { key: string }) => asset.key === "partitions/dipres/2026/06/manifest.json");
    expect(manifest?.data.toString("utf8")).toContain('"archived":true');
  });

  it("no marca el original completo como archivado si sólo existe un artefacto auxiliar", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-06-30T00:00:00Z", fuentes: { chilecompra: [{ id: "a-1", fecha: "2026-06-01", url: "https://api.mercadopublico.cl/a-1" }] } }, {
      originalAssets: [
        { sourceId: "chilecompra", year: 2026, month: 6, name: "original.jsonl.gz", url: "https://api.mercadopublico.cl", checksumSha256: "abc", size: 10, license: "CC0", redistributable: false },
        { sourceId: "chilecompra", year: 2026, month: 6, name: "rechazos.json", url: "https://api.mercadopublico.cl", data: Buffer.from("{}"), license: "CC0", redistributable: true },
      ],
    });
    const manifest = plan.assets.find((asset: { key: string }) => asset.key === "partitions/chilecompra/2026/06/manifest.json");
    expect(JSON.parse(manifest!.data.toString("utf8")).original).toMatchObject({ archived: false, artifacts: [{ archived: true }, { archived: false }] });
  });

  it("respeta el tipo contractual normalizado por un conector", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-06-30T00:00:00Z", fuentes: { chilecompra: [{ id: "award-1", fecha: "2026-06-01", kind: "contract", url: "https://api.mercadopublico.cl/real" }] } });
    const projection = recordAsset(plan, "partitions/chilecompra/2026/06");
    expect(gunzipSync(projection!.data).toString("utf8")).toContain('"kind":"contract"');
  });

  it("clasifica votos y gastos legacy antes de materializar D1", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-08-12T00:00:00Z", fuentes: {
      votaciones_senado: [{ id: "v-1", fecha: "2026-08-01", url: "https://senado.cl/voto/1", votos: [{ id: "1110", nombre: "Persona Senado" }] }],
      gastos_senado: [{ id: "g-1", fecha: "2026-08-01", url: "https://senado.cl/gasto/1", person: { entity_id: "senator-cl-ue-39", official_id: "39", name: "Persona Senado", role: "Senador/a" }, subject_entity_ids: ["senator-cl-ue-39"] }],
      gastos_camara: [{ id: "g-2", fecha: "2026-08-01", url: "https://camara.cl/gasto/2", diputado_id: "7" }],
    } });
    const kinds = plan.assets
      .filter((item: { key: string }) => item.key.includes("/records-") && item.key.endsWith(".jsonl.gz"))
      .flatMap((item: { data: Buffer }) => gunzipSync(item.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line).kind));
    expect(kinds.sort()).toEqual(["expense", "expense", "vote"]);
    const projections = plan.assets
      .filter((item: { key: string }) => item.key.includes("/records-") && item.key.endsWith(".jsonl.gz"))
      .flatMap((item: { data: Buffer }) => gunzipSync(item.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line)));
    expect(projections.find((item) => item.sourceId === "votaciones_senado").data.subject_entity_ids).toEqual(["person-senado-1110"]);
    expect(projections.find((item) => item.sourceId === "gastos_camara").data.subject_entity_ids).toEqual(["person-camara-7"]);
  });

  it("retiene particiones previas de otras fuentes al actualizar un período", () => {
    const existingCatalog = { partitions: [
      { id: "dipres/2026/06", sourceId: "dipres", period: "2026-06", releaseTag: "data-dipres-2026", manifestKey: "partitions/dipres/2026/06/manifest.json", recordCount: 15689, checksumSha256: "old", status: "partial" },
      { id: "chilecompra/2026/06", sourceId: "chilecompra", period: "2026-06", releaseTag: "data-chilecompra-2026", manifestKey: "old", recordCount: 1, checksumSha256: "old", status: "partial" },
    ] };
    const plan = buildLakePlan({ actualizado_en: "2026-06-30T00:00:00Z", fuentes: { chilecompra: [{ id: "award-2", fecha: "2026-06-01", kind: "contract", url: "https://api.mercadopublico.cl/real" }] } }, { existingCatalog });
    expect(plan.catalog.partitions.map((item: { id: string }) => item.id)).toEqual(["chilecompra/2026/06", "dipres/2026/06"]);
    expect(plan.catalog.sources.find((item: { id: string }) => item.id === "dipres")!.recordCount).toBe(15689);
    expect(plan.catalog.partitions.find((item: { id: string }) => item.id === "chilecompra/2026/06")!.manifestKey).toBe("partitions/chilecompra/2026/06/manifest.json");
    expect(plan.assets.some((item: { key: string }) => item.key === "sources/dipres/manifest.json")).toBe(false);
  });

  it("reemplaza las particiones de una fuente cuando inicia un backfill limpio", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-01-31T00:00:00Z", fuentes: { "ley-19862": [{
      id: "transfer-jan", fecha: "2026-01-02", kind: "transfer", url: "https://registros19862.gob.cl/transferencia/jan",
      receiver: { entity_id: "legal-cl-receiver", name: "Receptor", class: "Institución privada", rut_juridico: "70.000.000-2" },
      subject_entity_ids: ["legal-cl-emitter"], object_entity_ids: ["legal-cl-receiver"],
    }] } }, {
      existingCatalog: { partitions: [
        { id: "ley-19862/2025/12", sourceId: "ley-19862", period: "2025-12", releaseTag: "old", manifestKey: "old", recordCount: 11651, checksumSha256: "old", status: "partial" },
      ] },
      replaceSourceIds: ["ley-19862"],
    });
    expect(plan.catalog.partitions.map((partition: { id: string }) => partition.id)).toEqual(["ley-19862/2026/01"]);
  });

  it("publica fichas e índices cruzables usando sólo identificadores oficiales", () => {
    const plan = buildLakePlan({ actualizado_en: "2025-01-31T00:00:00Z", fuentes: { "ley-19862": [{ id: "transfer-1", fecha: "2025-01-02", kind: "transfer", url: "https://registros19862.gob.cl/transferencia/1", emitter: { entity_id: "legal-cl-a", name: "Emisor", class: "Ministerio o servicio público", rut_juridico: "60.000.000-1" }, receiver: { entity_id: "legal-cl-b", name: "Receptor", class: "Institución privada", rut_juridico: "70.000.000-2" }, subject_entity_ids: ["legal-cl-a"], object_entity_ids: ["legal-cl-b"] }] } });
    expect(entityAsset(plan, "ley-19862")).toBeDefined();
    expect(entityIndexAsset(plan, "ley-19862")).toBeDefined();
    const source = plan.catalog.sources.find((item: { id: string }) => item.id === "ley-19862")!;
    expect(source).toMatchObject({ entityCount: 2, entityKey: expect.stringMatching(/^entities\/v1\/ley-19862-[a-f0-9]{64}\.jsonl\.gz$/) });
    const index = entityIndexAsset(plan, "ley-19862")!;
    expect(gunzipSync(index.data).toString("utf8")).toContain('"predicate":"transferred_to"');
  });

  it("mantiene claves de entidades inmutables al repetir los mismos datos en otra ejecucion", () => {
    const fuentes = { "ley-19862": [{
      id: "transfer-1", fecha: "2025-01-02", url: "https://registros19862.gob.cl/transferencia/1",
      receiver: { entity_id: "legal-cl-b", name: "Receptor", class: "Institucion privada", rut_juridico: "70.000.000-2" },
    }] };
    const first = buildLakePlan({ actualizado_en: "2026-08-08T10:00:00Z", fuentes });
    const repeated = buildLakePlan({ actualizado_en: "2026-08-09T11:00:00Z", fuentes });

    expect(entityAsset(first, "ley-19862")?.key).toBe(entityAsset(repeated, "ley-19862")?.key);
    expect(entityAsset(first, "ley-19862")?.checksumSha256).toBe(entityAsset(repeated, "ley-19862")?.checksumSha256);
  });

  it("acumula entidades de Ley 19.862 cuando se reemplaza una partición mensual", () => {
    const first = buildLakePlan({ actualizado_en: "2026-01-31T00:00:00Z", fuentes: { "ley-19862": [{
      id: "transfer-jan", fecha: "2026-01-02", kind: "transfer", url: "https://registros19862.gob.cl/transferencia/jan",
      emitter: { entity_id: "legal-cl-emitter", name: "Emisor enero", class: "Ministerio", rut_juridico: "60.000.000-1" },
      receiver: { entity_id: "legal-cl-receiver-jan", name: "Receptor enero", class: "Institución privada", rut_juridico: "70.000.000-2" },
      subject_entity_ids: ["legal-cl-emitter"], object_entity_ids: ["legal-cl-receiver-jan"],
    }] } });
    const entities = gunzipSync(entityAsset(first, "ley-19862")!.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));
    const indexes = gunzipSync(entityIndexAsset(first, "ley-19862")!.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));

    const second = buildLakePlan({ actualizado_en: "2026-02-28T00:00:00Z", fuentes: { "ley-19862": [{
      id: "transfer-feb", fecha: "2026-02-02", kind: "transfer", url: "https://registros19862.gob.cl/transferencia/feb",
      emitter: { entity_id: "legal-cl-emitter", name: "Emisor febrero", class: "Ministerio", rut_juridico: "60.000.000-1" },
      receiver: { entity_id: "legal-cl-receiver-feb", name: "Receptor febrero", class: "Institución privada", rut_juridico: "71.000.000-3" },
      subject_entity_ids: ["legal-cl-emitter"], object_entity_ids: ["legal-cl-receiver-feb"],
    }] } }, { existingEntityBundles: { "ley-19862": { entities, indexes } } });

    expect(second.catalog.sources.find((source: { id: string }) => source.id === "ley-19862")).toMatchObject({ entityCount: 3 });
    const entityText = gunzipSync(entityAsset(second, "ley-19862")!.data).toString("utf8");
    expect(entityText).toContain('"id":"legal-cl-receiver-jan"');
    expect(entityText).toContain('"id":"legal-cl-receiver-feb"');
  });

  it("versiona Releases por todo el lote y no solo por el archivo de registros", () => {
    const fuentes = { camara: [{ id: "vote-1", fecha: "2026-08-01", url: "https://camara.cl/vote-1" }] };
    const first = buildLakePlan({ actualizado_en: "2026-08-08T10:00:00Z", fuentes });
    const repeated = buildLakePlan({ actualizado_en: "2026-08-09T11:00:00Z", fuentes });
    const firstPartition = first.assets.find((item) => item.key === "partitions/camara/2026/08/manifest.json")!;
    const repeatedPartition = repeated.assets.find((item) => item.key === "partitions/camara/2026/08/manifest.json")!;

    expect(firstPartition.checksumSha256).not.toBe(repeatedPartition.checksumSha256);
    expect(firstPartition.releaseTag).not.toBe(repeatedPartition.releaseTag);
  });

  it("acumula fichas e índices previos durante un backfill anual", () => {
    const first = buildLakePlan({ actualizado_en: "2025-12-31T00:00:00Z", fuentes: { dipres: [{
      id: "budget-2025", fecha: "2025-12-01", kind: "budget_execution", url: "https://dipres.gob.cl/2025.csv",
      entities: [{ id: "dipres-program-2025", kind: "public_body", name: "Programa 2025", identifiers: [{ scheme: "DIPRES-PROGRAM", value: "2025:1:1:1", isPublic: true }] }],
      subject_entity_ids: ["dipres-program-2025"], object_entity_ids: [],
    }] } });
    const entities = gunzipSync(entityAsset(first, "dipres")!.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));
    const indexes = gunzipSync(entityIndexAsset(first, "dipres")!.data).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));

    const second = buildLakePlan({ actualizado_en: "2026-01-31T00:00:00Z", fuentes: { dipres: [{
      id: "budget-2026", fecha: "2026-01-01", kind: "budget_execution", url: "https://dipres.gob.cl/2026.csv",
      entities: [{ id: "dipres-program-2026", kind: "public_body", name: "Programa 2026", identifiers: [{ scheme: "DIPRES-PROGRAM", value: "2026:1:1:1", isPublic: true }] }],
      subject_entity_ids: ["dipres-program-2026"], object_entity_ids: [],
    }] } }, { existingEntityBundles: { dipres: { entities, indexes } } });

    expect(second.catalog.sources.find((source: { id: string }) => source.id === "dipres")).toMatchObject({ entityCount: 2 });
    const entityText = gunzipSync(entityAsset(second, "dipres")!.data).toString("utf8");
    expect(entityText).toContain('"id":"dipres-program-2025"');
    expect(entityText).toContain('"id":"dipres-program-2026"');
    const indexText = gunzipSync(entityIndexAsset(second, "dipres")!.data).toString("utf8");
    expect(indexText).toContain('"id":"dipres-program-2025"');
    expect(indexText).toContain('"id":"dipres-program-2026"');
  });

  it("publica candidatos SERVEL como personas conciliadas por código oficial", () => {
    const plan = buildLakePlan({ actualizado_en: "2025-11-16T23:00:00Z", fuentes: { servel: [{
      id: "servel-2025-senators-749100001-55014013", fecha: "2025-11-16", kind: "vote",
      url: "https://www.servel.cl/oficial.zip",
      candidate: { entity_id: "servel-candidate-55014013", official_id: "55014013", name: "XIMENA ORDENES NEIRA", role: "Candidato/a" },
      subject_entity_ids: ["servel-candidate-55014013"], object_entity_ids: [],
    }] } });
    const entities = entityAsset(plan, "servel")!;
    expect(gunzipSync(entities.data).toString("utf8")).toContain('"scheme":"servel-candidate-code"');
    expect(plan.catalog.sources.find((item: { id: string }) => item.id === "servel")).toMatchObject({ entityCount: 1 });
  });

  it("cruza asistencia de Cámara con diputado y organismo mediante IDs oficiales", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-08-05T15:00:00Z", fuentes: { asistencia_camara: [{
      id: "camara-attendance-4809-1015", fecha: "2026-08-05", kind: "attendance", url: "https://opendata.congreso.cl/oficial",
      deputy: { entity_id: "person-camara-1015", official_id: "1015", name: "Jorge Brito Hasbún", role: "Diputado/a" },
      public_body: { entity_id: "public-body-camara", official_id: "camara-diputadas-diputados", name: "Cámara de Diputadas y Diputados" },
      subject_entity_ids: ["person-camara-1015"], object_entity_ids: ["public-body-camara"],
    }] } });
    const entities = entityAsset(plan, "camara")!;
    const entityText = gunzipSync(entities.data).toString("utf8");
    expect(entityText).toContain('"scheme":"camara-dipid"');
    expect(entityText).toContain('"id":"public-body-camara"');
    const records = recordAsset(plan, "partitions/camara/2026/08")!;
    expect(gunzipSync(records.data).toString("utf8")).toContain('"kind":"attendance"');
    const index = entityIndexAsset(plan, "camara")!;
    expect(gunzipSync(index.data).toString("utf8")).toContain('"toId":"public-body-camara"');
  });

  it("publica entidades y relaciones InfoLobby con RUT jurídico oficial", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-07-05T12:00:00Z", fuentes: { infolobby: [{
      id: "audiencia-1", fecha: "2026-07-05", kind: "lobby", lobby_event_kind: "audience", url: "https://www.infolobby.cl/oficial",
      entities: [
        { id: "person-infolobby-pasivo-1", kind: "person", name: "Autoridad", identifiers: [{ scheme: "infolobby-person-code", value: "pasivo-1", isPublic: true }] },
        { id: "legal-cl-776965952", kind: "legal_entity", name: "Empresa SpA", rut_juridico: "77.696.595-2", identifiers: [{ scheme: "CL-RUT", value: "77.696.595-2", isPublic: true }] },
        { id: "person-infolobby-malicioso", kind: "person", name: "Persona", rut_juridico: "77.696.595-2", identifiers: [{ scheme: "CL-RUT", value: "77.696.595-2", isPublic: true }] },
      ],
      subject_entity_ids: ["person-infolobby-pasivo-1"], object_entity_ids: ["legal-cl-776965952"],
    }] } });
    const entities = entityAsset(plan, "infolobby")!;
    const entityText = gunzipSync(entities.data).toString("utf8");
    expect(entityText).toContain('"rut_juridico":"77.696.595-2"');
    expect(entityText).toContain('"scheme":"CL-RUT"');
    expect(entityText.split('"rut_juridico":"77.696.595-2"')).toHaveLength(2);
    const index = entityIndexAsset(plan, "infolobby")!;
    expect(gunzipSync(index.data).toString("utf8")).toContain('"predicate":"documented_lobby_contact"');
  });

  it("respeta relaciones tipadas emitidas por el conector", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-03-01T00:00:00Z", fuentes: { infoprobidad: [{
      id: "declaration-1", fecha: "2026-03-01", kind: "declaration", url: "https://datos.cplt.cl/declaration-1",
      entities: [
        { id: "person-infoprobidad-1", kind: "person", name: "Persona", identifiers: [{ scheme: "infoprobidad-person-code", value: "1", isPublic: true }] },
        { id: "legal-cl-776965952", kind: "legal_entity", name: "Empresa", rut_juridico: "77.696.595-2" },
      ],
      subject_entity_ids: ["person-infoprobidad-1"], object_entity_ids: ["legal-cl-776965952"],
      relations: [{ fromId: "person-infoprobidad-1", predicate: "declared_legal_interest", toId: "legal-cl-776965952", method: "official_declaration_json" }],
    }] } });
    const index = entityIndexAsset(plan, "infoprobidad")!;
    const text = gunzipSync(index.data).toString("utf8");
    expect(text).toContain('"predicate":"declared_legal_interest"');
    expect(text).toContain('"method":"official_declaration_json"');
  });

  it("concilia compradores y proveedores jurídicos de ChileCompra por RUT oficial", () => {
    const plan = buildLakePlan({ actualizado_en: "2026-06-01T00:00:00Z", fuentes: { chilecompra: [{
      id: "award-1", fecha: "2026-06-01", kind: "contract", url: "https://api.mercadopublico.cl/award/60.910.000-1",
      buyer: { id: "CL-MP-10", name: "Organismo 60.910.000-1", rut_juridico: "60.910.000-1" },
      suppliers: [{ id: "CL-MP-20", name: "Empresa SpA", rut_juridico: "76.044.753-6" }],
    }] } });
    const entities = gunzipSync(entityAsset(plan, "chilecompra")!.data).toString("utf8");
    expect(entities).toContain('"id":"legal-cl-609100001"');
    expect(entities).toContain('"id":"legal-cl-760447536"');
    expect(entities).toContain('"value":"60.910.000-1"');
    expect(entities).toContain('"name":"Organismo 60.910.000-1"');
    expect(entities).toContain('https://api.mercadopublico.cl/award/60.910.000-1');
    const records = gunzipSync(recordAsset(plan, "partitions/chilecompra/2026/06")!.data).toString("utf8");
    expect(records).toContain('"subject_entity_ids":["legal-cl-609100001"]');
    expect(records).toContain('"object_entity_ids":["legal-cl-760447536"]');
  });

  it("particiona ChileCompra por el período oficial de extracción y conserva la fecha del evento", () => {
    const existingCatalog = { partitions: [{
      id: "chilecompra/2026/07", sourceId: "chilecompra", period: "2026-07", releaseTag: "data-chilecompra-2026",
      manifestKey: "legacy", recordCount: 8212, checksumSha256: "legacy", status: "partial",
    }] };
    const plan = buildLakePlan({ actualizado_en: "2026-08-08T00:00:00Z", fuentes: { chilecompra: [{
      id: "award-late", fecha: "2026-07-03", source_period: "2026-06", kind: "purchase", url: "https://api.mercadopublico.cl/award-late",
    }] } }, { existingCatalog });

    expect(plan.catalog.partitions.map((partition: { period: string }) => partition.period)).toEqual(["2026-06"]);
    expect(plan.catalog.partitions[0].sourcePeriod).toBe("2026-06");
    const records = gunzipSync(recordAsset(plan, "partitions/chilecompra/2026/06")!.data).toString("utf8");
    expect(records).toContain('"occurredAt":"2026-07-03"');
    expect(records).toContain('"source_period":"2026-06"');
  });

  it("conserva una fuente inventariada sin particiones durante ingestas dedicadas", () => {
    const previousSource = {
      id: "transparencia-activa", status: "partial", foundPeriods: [], recordCount: 0,
      discoveredAssetCount: 80, indexChecksumSha256: "abc123", error: "portal temporalmente inaccesible",
      entityKey: null, entityIndexKey: null, entityCount: 0,
    };
    const existingCatalog = { sources: [previousSource], partitions: [] };
    const plan = buildLakePlan({ actualizado_en: "2026-08-08T00:00:00Z", fuentes: {} }, {
      existingCatalog,
    });

    expect(plan.catalog.sources).toContainEqual(previousSource);
  });
});
