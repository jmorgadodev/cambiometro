import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { createGunzip } from "node:zlib";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { canonicalizeLakeRecord, D1_ARCHIVE_ONLY_SOURCES, entityFromRosterMember, relationsFromLakeRecord, selectMaterializedPartitions, sourceStateChecksum } from "./etl/materialize.mjs";
import { fetchParliamentRosters } from "./etl/parliament-rosters.mjs";
import { reconcilePersonAliases } from "./etl/person-reconciliation.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const database = argument("--database", "transparencia-db");
const bucket = argument("--bucket", "transparencia-public-data");
const lakeRoot = resolve(argument("--lake", "data/lake"));
const isRemote = process.argv.includes("--remote");
const dryRun = process.argv.includes("--dry-run");
const includeAllHistory = process.argv.includes("--all-history");
const requestedSourceIds = new Set((argument("--sources", "") ?? "").split(",").map((value) => value.trim()).filter(Boolean));
const allowLocalAuth = process.argv.includes("--local-auth") && !process.env.CI;
const runId = process.env.ETL_RUN_ID?.trim() || `local-${Date.now()}`;
const cadence = process.env.ETL_CADENCE?.trim() || "manual";
const stageBatchSize = Number(argument("--stage-batch", "5000"));
if (!Number.isSafeInteger(stageBatchSize) || stageBatchSize < 100 || stageBatchSize > 10_000) {
  throw new Error("D1_INVALID_STAGE_BATCH_SIZE");
}
const wranglerBin = resolve("node_modules/wrangler/bin/wrangler.js");
const wranglerConfig = resolve("workers/public-api/wrangler.jsonc");
const work = mkdtempSync(join(tmpdir(), "cambiometro-d1-"));
const showHelp = process.argv.includes("--help") || process.argv.includes("-h");

function command(binary, args, allowFailure = false) {
  const result = spawnSync(binary, args, { encoding: "utf8", stdio: allowFailure ? "pipe" : "inherit" });
  if (!allowFailure && result.status !== 0) throw new Error(`${binary} fallo con codigo ${result.status}`);
  return result;
}

function wrangler(args, allowFailure = false) {
  return command(process.execPath, [wranglerBin, "--config", wranglerConfig, ...args], allowFailure);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replace(/\0/g, "").replace(/'/g, "''")}'`;
}

function executeSql(text, label, allowFailure = false) {
  if (dryRun) return { status: 0 };
  const filePath = join(work, `${label}-${createHash("sha1").update(label + Math.random()).digest("hex")}.sql`);
  writeFileSync(filePath, text, "utf8");
  return wrangler(["d1", "execute", database, isRemote ? "--remote" : "--local", "--file", filePath], allowFailure);
}

function queryScalar(text, field) {
  if (dryRun) return 0;
  const result = wrangler(["d1", "execute", database, isRemote ? "--remote" : "--local", "--command", text, "--json"], true);
  if (result.status !== 0) throw new Error(`D1_SCALAR_QUERY_FAILED: ${field}`);
  const payload = JSON.parse(result.stdout);
  return Number(payload?.[0]?.results?.[0]?.[field] ?? 0);
}

function queryRows(text) {
  if (dryRun) return [];
  const result = wrangler(["d1", "execute", database, isRemote ? "--remote" : "--local", "--command", text, "--json"], true);
  if (result.status !== 0) throw new Error("D1_ROWS_QUERY_FAILED");
  const payload = JSON.parse(result.stdout);
  return payload?.[0]?.results ?? [];
}

function queryRowsPaged(text, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = queryRows(`${text}\nLIMIT ${pageSize} OFFSET ${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function clearLegacyRelations() {
  const legacyCount = queryScalar("SELECT COUNT(*) AS total FROM relations WHERE source_id IS NULL", "total");
  const batches = Math.ceil(legacyCount / 10_000);
  for (let index = 0; index < batches; index += 1) {
    executeSql("DELETE FROM relations WHERE rowid IN (SELECT rowid FROM relations WHERE source_id IS NULL LIMIT 10000);", `legacy-relations-${index}`);
  }
}

class StageWriter {
  constructor() {
    this.statements = [];
    this.chunk = 0;
  }

  add(statement) {
    this.statements.push(statement);
    if (this.statements.length >= stageBatchSize) this.flush();
  }

  flush() {
    if (this.statements.length === 0) return;
    // Wrangler maps the statements in a SQL file to a D1 batch. D1 batches
    // provide the transaction boundary; explicit SQL BEGIN/COMMIT is rejected.
    executeSql(`${this.statements.join("\n")}\n`, `stage-${this.chunk}`);
    this.chunk += 1;
    this.statements = [];
  }
}

function localAsset(key) {
  const filePath = resolve(lakeRoot, key);
  return filePath.startsWith(`${lakeRoot}\\`) || filePath.startsWith(`${lakeRoot}/`) ? filePath : null;
}

function downloadAsset(key, releaseTag, releaseAssetName) {
  const local = localAsset(key);
  if (local && existsSync(local)) return local;
  const extension = basename(key).replace(/[^a-zA-Z0-9._-]/g, "_");
  const target = join(work, `${sha256(Buffer.from(key)).slice(0, 16)}-${extension}`);
  const r2 = wrangler(["r2", "object", "get", `${bucket}/${key}`, "--file", target, "--remote"], true);
  if (r2.status === 0 && existsSync(target)) return target;

  if (!releaseTag || !releaseAssetName || !process.env.GH_TOKEN?.trim()) {
    throw new Error(`D1_ASSET_UNAVAILABLE: ${key}`);
  }
  const releaseDir = join(work, sha256(Buffer.from(`${releaseTag}/${releaseAssetName}`)).slice(0, 16));
  const release = command("gh", ["release", "download", releaseTag, "--pattern", releaseAssetName, "--dir", releaseDir, "--clobber"], true);
  const downloaded = join(releaseDir, releaseAssetName);
  if (release.status !== 0 || !existsSync(downloaded)) throw new Error(`D1_RELEASE_ASSET_UNAVAILABLE: ${releaseTag}/${releaseAssetName}`);
  return downloaded;
}

async function* jsonLinesGzip(filePath) {
  const stream = createReadStream(filePath).pipe(createGunzip());
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line);
}

function stageEntity(writer, entity, sourceId, seen) {
  if (!entity?.id || !entity?.kind || !entity?.name || seen.has(entity.id)) return;
  seen.add(entity.id);
  writer.add(`INSERT OR REPLACE INTO stage_entities (run_id,id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at) VALUES (${sql(runId)},${sql(entity.id)},${sql(entity.kind)},${sql(entity.name)},${sql(entity.identifiers ?? [])},${sql(entity.attributes ?? {})},${sql(entity.sourceIds ?? [sourceId])},${sql(entity.updatedAt ?? null)});`);
}

function stageRecord(writer, record) {
  writer.add(`INSERT OR REPLACE INTO stage_records (run_id,id,kind,source_id,title,description,occurred_at,period_json,subject_entity_ids_json,object_entity_ids_json,amount_json,evidence_json,data_json) VALUES (${sql(runId)},${sql(record.id)},${sql(record.kind)},${sql(record.sourceId)},${sql(record.title)},${sql(record.description)},${sql(record.occurredAt)},${sql(record.period)},${sql(record.subjectEntityIds)},${sql(record.objectEntityIds)},${sql(record.amount)},${sql(record.evidence)},${sql(record.data)});`);
}

function stageRelation(writer, relation) {
  writer.add(`INSERT OR REPLACE INTO stage_relations (run_id,id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer) VALUES (${sql(runId)},${sql(relation.id)},${sql(relation.fromId)},${sql(relation.predicate)},${sql(relation.toId)},${sql(relation.evidenceRecordIds)},${sql(relation.period)},${sql(relation.reconciliation)},${sql(relation.disclaimer)});`);
}

async function main() {
  if (isRemote && !dryRun && !allowLocalAuth) requireCloudflareDataCredentials();
  const catalogPath = join(lakeRoot, "catalog", "v1", "manifest.json");
  if (!existsSync(catalogPath)) throw new Error(`D1_MISSING_CATALOG: ${catalogPath}`);
  const catalogBuffer = readFileSync(catalogPath);
  const catalog = JSON.parse(catalogBuffer.toString("utf8"));
  if (!Array.isArray(catalog.partitions) || !Array.isArray(catalog.sources)) throw new Error("D1_INVALID_CATALOG");
  const sourcesToMaterialize = requestedSourceIds.size > 0
    ? catalog.sources.filter((source) => requestedSourceIds.has(source.id))
    : catalog.sources;
  const missingSources = [...requestedSourceIds].filter((sourceId) => !sourcesToMaterialize.some((source) => source.id === sourceId));
  if (missingSources.length > 0) throw new Error(`D1_UNKNOWN_SOURCES: ${missingSources.join(",")}`);
  const selectedSourceIds = new Set(sourcesToMaterialize.map((source) => source.id));
  const catalogErrors = sourcesToMaterialize.filter((source) => source.error);
  if (catalogErrors.length > 0) throw new Error(`D1_CATALOG_SOURCE_ERRORS: ${catalogErrors.map((source) => source.id).join(",")}`);
  const selectedPartitions = selectMaterializedPartitions(catalog.partitions, { includeAllHistory })
    .filter((partition) => selectedSourceIds.has(partition.sourceId));
  const selectedPartitionIds = new Set(selectedPartitions.map((partition) => partition.id));
  const expectedCounts = new Map();
  for (const partition of selectedPartitions) {
    expectedCounts.set(partition.sourceId, (expectedCounts.get(partition.sourceId) ?? 0) + partition.recordCount);
  }

  if (!dryRun) wrangler(["d1", "migrations", "apply", database, isRemote ? "--remote" : "--local"]);
  executeSql(`INSERT OR REPLACE INTO etl_runs (id,cadence,status,started_at,catalog_version,catalog_checksum,source_count) VALUES (${sql(runId)},${sql(cadence)},'running',CURRENT_TIMESTAMP,${sql(catalog.generatedAt)},${sql(sha256(catalogBuffer))},${sourcesToMaterialize.length});\nDELETE FROM stage_entities WHERE run_id=${sql(runId)};\nDELETE FROM stage_records WHERE run_id=${sql(runId)};\nDELETE FROM stage_relations WHERE run_id=${sql(runId)};`, "start");

  const writer = new StageWriter();
  const entityIds = new Set();
  const recordIds = new Set();
  const counts = new Map();

  let roster = [];
  const manageMandates = requestedSourceIds.size === 0 || selectedSourceIds.has("camara") || selectedSourceIds.has("senado");
  if (!dryRun && manageMandates) {
    roster = await fetchParliamentRosters();
    const rosterValues = roster.map((member) => `(${sql(runId)},${sql(member.entityId)},${sql(member.chamber)},${sql(member.name)},${sql(member.evidenceUrl)},CURRENT_TIMESTAMP)`).join(",\n");
    executeSql(`DELETE FROM mandate_snapshot WHERE run_id=${sql(runId)};\nINSERT INTO mandate_snapshot (run_id,entity_id,chamber,name,evidence_url,observed_at) VALUES ${rosterValues};`, "roster");
  }

  for (const source of sourcesToMaterialize) {
    if (!source.entityKey) continue;
    const entityPath = downloadAsset(source.entityKey, null, null);
    let sourceEntityCount = 0;
    for await (const entity of jsonLinesGzip(entityPath)) {
      const previousSize = entityIds.size;
      stageEntity(writer, entity, source.id, entityIds);
      if (entityIds.size > previousSize) sourceEntityCount += 1;
    }
    if (Number.isInteger(source.entityCount) && sourceEntityCount > source.entityCount) {
      throw new Error(`D1_ENTITY_COUNT_MISMATCH: ${source.id} expected <= ${source.entityCount}, got ${sourceEntityCount}`);
    }
  }
  for (const member of roster) stageEntity(writer, entityFromRosterMember(member), member.chamber, entityIds);
  writer.flush();

  if (!dryRun) {
    const sourceValues = sourcesToMaterialize.map((source) => `(${sql(source.id)},${sql(source.id)},NULL,NULL,NULL,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).join(",\n");
    executeSql(`INSERT OR REPLACE INTO sources (id,label,organization,official_url,license,expected_coverage,created_at,updated_at) VALUES ${sourceValues};
INSERT OR REPLACE INTO entities SELECT id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at FROM stage_entities WHERE run_id=${sql(runId)};
DELETE FROM stage_entities WHERE run_id=${sql(runId)};`, "entities");
    clearLegacyRelations();
  }

  for (const partition of catalog.partitions) {
    if (!selectedPartitionIds.has(partition.id)) continue;
    const [year, month] = String(partition.period).split("-");
    const manifestName = `${partition.sourceId}-${year}-${month}-manifest.json`;
    const manifestPath = downloadAsset(partition.manifestKey, partition.releaseTag, manifestName);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.recordCount !== partition.recordCount) throw new Error(`D1_MANIFEST_COUNT_MISMATCH: ${partition.id}`);
    let partitionCount = 0;

    for (const artifact of manifest.artifacts ?? []) {
      if (!artifact.key?.endsWith(".jsonl.gz")) continue;
      const artifactPath = downloadAsset(artifact.key, partition.releaseTag, artifact.releaseAssetName);
      const artifactBuffer = readFileSync(artifactPath);
      if (sha256(artifactBuffer) !== artifact.checksumSha256) throw new Error(`D1_ARTIFACT_CHECKSUM_MISMATCH: ${artifact.key}`);
      for await (const raw of jsonLinesGzip(artifactPath)) {
        if (recordIds.has(raw.id)) throw new Error(`D1_DUPLICATE_RECORD_ID: ${raw.id}`);
        recordIds.add(raw.id);
        partitionCount += 1;
        counts.set(partition.sourceId, (counts.get(partition.sourceId) ?? 0) + 1);
        for (const entity of raw.data?.entities ?? []) stageEntity(writer, entity, partition.sourceId, entityIds);
        const record = canonicalizeLakeRecord(raw);
        stageRecord(writer, record);
        for (const relation of relationsFromLakeRecord(raw)) stageRelation(writer, relation);
      }
    }
    if (partitionCount !== partition.recordCount) throw new Error(`D1_PARTITION_PARITY_FAILED: ${partition.id} expected ${partition.recordCount}, got ${partitionCount}`);
    const nextPartition = catalog.partitions.slice(catalog.partitions.indexOf(partition) + 1)
      .find((candidate) => selectedPartitionIds.has(candidate.id));
    if (!nextPartition || nextPartition.sourceId !== partition.sourceId) {
      writer.flush();
      const source = sourcesToMaterialize.find((candidate) => candidate.id === partition.sourceId);
      const actual = counts.get(partition.sourceId) ?? 0;
      const expected = expectedCounts.get(partition.sourceId) ?? 0;
      if (actual !== expected) throw new Error(`D1_SOURCE_PARITY_FAILED: ${partition.sourceId} expected ${expected}, got ${actual}`);
      if (!dryRun && source) finalizeSource(source, actual, expected < source.recordCount);
    }
  }

  for (const source of sourcesToMaterialize.filter((candidate) => !selectedPartitions.some((partition) => partition.sourceId === candidate.id))) {
    counts.set(source.id, 0);
    if (!dryRun) finalizeSource(source, 0, source.recordCount > 0);
  }

  let reconciledAliasCount = 0;
  if (!dryRun && selectedSourceIds.has("infoprobidad")) {
    const personRows = queryRowsPaged(`SELECT id,kind,name,source_ids_json FROM entities
WHERE kind='person' AND (id LIKE 'person-camara-%' OR id LIKE 'person-senado-%' OR id LIKE 'person-infoprobidad-%')
ORDER BY id`)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        name: row.name,
        identifiers: [],
        sourceIds: JSON.parse(row.source_ids_json),
    }));
    const aliases = reconcilePersonAliases(personRows).filter((alias) => alias.sourceId === "infoprobidad");
    writer.add("DELETE FROM entity_aliases WHERE source_id='infoprobidad';");
    for (const alias of aliases) {
      writer.add(`INSERT OR REPLACE INTO entity_aliases (alias_id,canonical_id,source_id,method,confidence,evidence_json,updated_at) VALUES (${sql(alias.aliasId)},${sql(alias.canonicalId)},${sql(alias.sourceId)},${sql(alias.method)},${alias.confidence},${sql(alias.evidence)},CURRENT_TIMESTAMP);`);
    }
    writer.flush();
    reconciledAliasCount = aliases.length;
  }

  function finalizeSource(source, actual, truncatedHistory) {
    const archiveOnly = D1_ARCHIVE_ONLY_SOURCES.has(source.id) && !includeAllHistory;
    const sourceStatus = archiveOnly ? "archive_only" : actual === 0 ? "unavailable" : truncatedHistory ? "partial" : source.status;
    const orphanEntityReferences = queryScalar(`SELECT COUNT(*) AS total FROM (
  SELECT subjects.value AS entity_id FROM stage_records,json_each(stage_records.subject_entity_ids_json) subjects
    WHERE run_id=${sql(runId)} AND source_id=${sql(source.id)}
  UNION ALL
  SELECT objects.value AS entity_id FROM stage_records,json_each(stage_records.object_entity_ids_json) objects
    WHERE run_id=${sql(runId)} AND source_id=${sql(source.id)}
  UNION ALL
  SELECT from_id AS entity_id FROM stage_relations WHERE run_id=${sql(runId)}
  UNION ALL
  SELECT to_id AS entity_id FROM stage_relations WHERE run_id=${sql(runId)}
) refs
LEFT JOIN entities published ON published.id=refs.entity_id
LEFT JOIN stage_entities staged ON staged.run_id=${sql(runId)} AND staged.id=refs.entity_id
WHERE published.id IS NULL AND staged.id IS NULL;`, "total");
    if (orphanEntityReferences > 0) {
      throw new Error(`D1_ORPHAN_ENTITY_REFERENCES: ${source.id} has ${orphanEntityReferences}`);
    }
    executeSql(`INSERT OR REPLACE INTO entities
SELECT id,kind,name,identifiers_json,attributes_json,source_ids_json,updated_at
FROM stage_entities WHERE run_id=${sql(runId)};
DELETE FROM stage_entities WHERE run_id=${sql(runId)};`, `publish-record-entities-${source.id}`);
    executeSql(`DELETE FROM relations WHERE source_id=${sql(source.id)};`, `cleanup-relations-${source.id}`);
    executeSql(`DELETE FROM record_subjects WHERE record_id IN (SELECT id FROM records WHERE source_id=${sql(source.id)});
DELETE FROM record_objects WHERE record_id IN (SELECT id FROM records WHERE source_id=${sql(source.id)});
DELETE FROM records WHERE source_id=${sql(source.id)};`, `cleanup-records-${source.id}`);
    executeSql(`INSERT INTO records SELECT id,kind,source_id,title,description,occurred_at,period_json,subject_entity_ids_json,object_entity_ids_json,amount_json,evidence_json,data_json
FROM stage_records WHERE run_id=${sql(runId)} AND source_id=${sql(source.id)};`, `publish-records-${source.id}`);
    executeSql(`INSERT OR REPLACE INTO relations (id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer,source_id)
SELECT id,from_id,predicate,to_id,evidence_record_ids_json,period_json,reconciliation_json,disclaimer,${sql(source.id)}
FROM stage_relations WHERE run_id=${sql(runId)};`, `publish-custom-relations-${source.id}`);
    executeSql(`INSERT OR IGNORE INTO record_subjects SELECT stage_records.id,json_each.value FROM stage_records,json_each(stage_records.subject_entity_ids_json) WHERE run_id=${sql(runId)} AND source_id=${sql(source.id)};
INSERT OR IGNORE INTO record_objects SELECT stage_records.id,json_each.value FROM stage_records,json_each(stage_records.object_entity_ids_json) WHERE run_id=${sql(runId)} AND source_id=${sql(source.id)};
INSERT OR REPLACE INTO source_state (source_id,etl_run_id,status,record_count,checksum_sha256,generated_at,last_success_at,error,published_version,updated_at)
VALUES (${sql(source.id)},${sql(runId)},${sql(sourceStatus)},${actual},${sql(sourceStateChecksum(source, catalog.partitions))},${sql(catalog.generatedAt)},CASE WHEN ${sql(sourceStatus)} IN ('connected','complete','partial','archive_only') THEN CURRENT_TIMESTAMP ELSE NULL END,${sql(source.error ?? null)},${sql(catalog.generatedAt)},CURRENT_TIMESTAMP);
DELETE FROM stage_relations WHERE run_id=${sql(runId)};
DELETE FROM stage_records WHERE run_id=${sql(runId)};`, `finalize-state-${source.id}`);
  }

  const mandateFinalize = manageMandates ? `INSERT INTO mandates (id,entity_id,chamber,seat,started_at,ended_at,status,cause,evidence_url,missing_streak,last_seen_at,updated_at)
SELECT 'mandate-' || chamber || '-' || entity_id,entity_id,chamber,NULL,date(observed_at),NULL,'active',NULL,evidence_url,0,observed_at,CURRENT_TIMESTAMP
FROM mandate_snapshot WHERE run_id=${sql(runId)}
ON CONFLICT(id) DO UPDATE SET status='active',ended_at=NULL,cause=NULL,evidence_url=excluded.evidence_url,missing_streak=0,last_seen_at=excluded.last_seen_at,updated_at=CURRENT_TIMESTAMP;
UPDATE mandates SET missing_streak=missing_streak+1,status='pending_change',cause='cese o reemplazo detectado',updated_at=CURRENT_TIMESTAMP
WHERE status IN ('active','pending_change') AND entity_id NOT IN (SELECT entity_id FROM mandate_snapshot WHERE run_id=${sql(runId)});
UPDATE mandates SET status='closed',ended_at=date('now'),cause='cese o reemplazo detectado',updated_at=CURRENT_TIMESTAMP
WHERE status='pending_change' AND missing_streak>=2;
` : "";
  const finalizeRun = `${mandateFinalize}UPDATE etl_runs SET status='success',finished_at=CURRENT_TIMESTAMP,record_count=${recordIds.size} WHERE id=${sql(runId)};
DELETE FROM stage_entities WHERE run_id=${sql(runId)};
DELETE FROM stage_records WHERE run_id=${sql(runId)};
DELETE FROM stage_relations WHERE run_id=${sql(runId)};
DELETE FROM mandate_snapshot WHERE run_id=${sql(runId)};`;
  executeSql(finalizeRun, "finalize-run");
  console.log(JSON.stringify({
    runId,
    status: dryRun ? "validated" : "success",
    records: recordIds.size,
    catalogRecords: catalog.sources.reduce((total, source) => total + source.recordCount, 0),
    entities: entityIds.size,
    sources: Object.fromEntries(counts),
    reconciledAliases: reconciledAliasCount,
    historyPolicy: includeAllHistory ? "all" : "hot_d1_full_r2",
  }, null, 2));
}

if (showHelp) {
  console.log(`Uso: node scripts/materialize-d1.mjs [opciones]

Opciones:
  --database <nombre>  D1 destino (por defecto: transparencia-db)
  --bucket <nombre>    R2 de origen (por defecto: transparencia-public-data)
  --lake <ruta>        Lago/manifest local (por defecto: data/lake)
  --remote             Materializar la D1 remota
  --dry-run            Validar artefactos y paridad sin escribir D1
  --all-history        Materializar también históricos extensos (requiere D1 con capacidad suficiente)
  --sources <ids>      Materializar sólo las fuentes indicadas, separadas por coma
  --stage-batch <n>    Sentencias por importación de staging (por defecto: 5000)
  --local-auth         Usar la sesion local de Wrangler (prohibido en CI)
  --help, -h           Mostrar esta ayuda`);
  rmSync(work, { recursive: true, force: true });
} else {
  main().catch((error) => {
    executeSql(`UPDATE etl_runs SET status='failed',finished_at=CURRENT_TIMESTAMP,error=${sql(String(error?.message ?? error).slice(0, 2000))} WHERE id=${sql(runId)};
DELETE FROM stage_entities WHERE run_id=${sql(runId)};
DELETE FROM stage_records WHERE run_id=${sql(runId)};
DELETE FROM stage_relations WHERE run_id=${sql(runId)};
DELETE FROM mandate_snapshot WHERE run_id=${sql(runId)};`, "failure", true);
    console.error("[materialize-d1]", error);
    process.exitCode = 1;
  }).finally(() => rmSync(work, { recursive: true, force: true }));
}
