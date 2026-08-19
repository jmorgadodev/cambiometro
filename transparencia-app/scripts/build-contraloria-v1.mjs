/**
 * Proyección v1: auditorías de la Contraloría (particiones del lake) hacia la
 * plataforma local (data-platform-v1). Salida: data/lake/projections/v1/contraloria.json
 *
 * Uso: node scripts/build-contraloria-v1.mjs [--output data/lake/projections/v1/contraloria.json]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lakeRoot = join(root, "data", "lake");
const outputPath = resolve(argument("--output") ?? join(lakeRoot, "projections", "v1", "contraloria.json"));
if (!outputPath.startsWith(`${lakeRoot}${sep}`)) throw new Error("INVALID_OUTPUT_PATH");
const CGR_ENTITY_ID = "public-body-cgr";
const CGR_ENTITY_NAME = "Contraloría General de la República";
const DISCLAIMER = "La relación documental no implica irregularidad ni responsabilidad.";

const catalog = JSON.parse(readFileSync(join(lakeRoot, "catalog", "v1", "manifest.json"), "utf8"));
const generatedAt = catalog.generatedAt ?? new Date().toISOString();
const partitions = (catalog.partitions ?? []).filter((partition) =>
  partition.id.startsWith("contraloria/"),
);

const entities = new Map();
const records = [];
const relations = [];

function ensureEntity(id, name, kind = "public_body") {
  if (!id || entities.has(id)) return;
  entities.set(id, {
    id,
    kind,
    name: String(name ?? "Entidad sin nombre publicado"),
    identifiers: [],
    attributes: {},
    sourceIds: ["contraloria"],
    updatedAt: generatedAt,
  });
}

ensureEntity(CGR_ENTITY_ID, CGR_ENTITY_NAME);

for (const partition of partitions) {
  const partitionDir = join(lakeRoot, "partitions", partition.id);
  if (!existsSync(partitionDir)) continue;
  let recordsFile = null;
  const partitionManifestPath = join(partitionDir, "manifest.json");
  if (existsSync(partitionManifestPath)) {
    const partitionManifest = JSON.parse(readFileSync(partitionManifestPath, "utf8"));
    const artifactKey = partitionManifest?.artifacts?.[0]?.key;
    if (artifactKey) recordsFile = basename(artifactKey);
  }
  if (!recordsFile) {
    recordsFile = readdirSync(partitionDir).find(
      (file) => file.startsWith("records-") && file.endsWith(".jsonl.gz") && !file.includes("-derived"),
    );
  }
  if (!recordsFile || !existsSync(join(partitionDir, recordsFile))) continue;
  const lines = gunzipSync(readFileSync(join(partitionDir, recordsFile))).toString("utf8").trim();
  if (!lines) continue;
  for (const line of lines.split("\n")) {
    const wrapped = JSON.parse(line);
    if (wrapped.kind !== "audit") continue;
    const data = wrapped.data ?? {};
    for (const entity of data.entities ?? []) {
      if (entity?.kind !== "public_body") continue;
      ensureEntity(entity.id, entity.name);
    }
    const subjectEntityIds = Array.isArray(data.subject_entity_ids) && data.subject_entity_ids.length
      ? data.subject_entity_ids
      : [CGR_ENTITY_ID];
    const objectEntityIds = Array.isArray(data.object_entity_ids) && data.object_entity_ids.length
      ? data.object_entity_ids
      : [CGR_ENTITY_ID];
    const occurredAt = wrapped.occurredAt ?? data.published_at ?? data.fecha ?? null;
    const periodLabel = occurredAt?.slice(0, 7) ?? data.period ?? null;
    const conclusions = String(data.conclusions ?? "").trim();
    const findings = Array.isArray(data.findings) ? data.findings : [];
    records.push({
      id: wrapped.id,
      kind: "audit",
      sourceId: wrapped.sourceId ?? "contraloria",
      title: data.title ?? `Informe de auditoría ${data.report_number ?? ""}`.trim(),
      description: data.description ?? data.report_type ?? null,
      occurredAt,
      fecha: occurredAt,
      period: {
        from: occurredAt?.slice(0, 10) ?? null,
        to: occurredAt?.slice(0, 10) ?? null,
        label: periodLabel,
      },
      subjectEntityIds,
      objectEntityIds,
      amount: data.amount ?? null,
      evidence: {
        sourceUrl:
          wrapped.evidence?.sourceUrl ??
          data.url ??
          "https://www.contraloria.cl/web/cgr/informes-de-auditoria",
        checksumSha256: data.document_checksum_sha256 ?? null,
        retrievedAt: generatedAt,
        documentPage: data.document_locator?.page ?? null,
      },
      data: {
        report_number: data.report_number ?? null,
        report_year: data.report_year ?? null,
        report_type: data.report_type ?? null,
        level: data.level ?? null,
        area: data.area ?? null,
        region: data.region ?? null,
        cgr_unit: data.cgr_unit ?? null,
        service: data.service ?? null,
        status: data.status ?? null,
        objectives: data.objectives ?? null,
        scope_universe: data.scope_universe ?? null,
        sample: data.sample ?? null,
        conclusions: conclusions.length > 600 ? `${conclusions.slice(0, 600)}…` : conclusions || null,
        findings_count: findings.length,
      },
    });

    const serviceRelation = (data.relations ?? []).find(
      (relation) => relation?.predicate === "audited" || (relation?.fromId === CGR_ENTITY_ID && relation?.toId !== CGR_ENTITY_ID),
    );
    const serviceToId = serviceRelation?.toId ?? objectEntityIds.find((id) => id !== CGR_ENTITY_ID);
    if (serviceToId) {
      relations.push({
        id: `${wrapped.id}-relation`,
        fromId: CGR_ENTITY_ID,
        predicate: "audited",
        toId: serviceToId,
        evidenceRecordIds: [wrapped.id],
        period: { from: occurredAt?.slice(0, 10) ?? null, to: occurredAt?.slice(0, 10) ?? null },
        reconciliation: { method: "official_report_number", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }
}

records.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "") || a.id.localeCompare(b.id));
relations.sort((a, b) => a.id.localeCompare(b.id));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt,
      sourceId: "contraloria",
      entityCount: entities.size,
      recordCount: records.length,
      relationCount: relations.length,
      entities: [...entities.values()],
      records,
      relations,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(
  `OK contraloria: ${records.length} auditorías · ${entities.size} entidades · ${relations.length} relaciones → ${outputPath}`,
);