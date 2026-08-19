import fs from "fs";
import path from "path";

console.log("Generando archivo SQL para sembrar D1...");

const jsonPath = path.join(process.cwd(), "data", "entidades-canonica.json");
const { entities, records, relations } = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const sqlPath = path.join(process.cwd(), "scripts", "db", "seed-entidades.sql");
const stream = fs.createWriteStream(sqlPath);

function escape(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
}

stream.write("BEGIN TRANSACTION;\n\n");

console.log(`Escribiendo ${entities.length} entidades...`);
for (const e of entities) {
  stream.write(`INSERT OR REPLACE INTO entities (id, kind, name, identifiers_json, attributes_json, source_ids_json, updated_at) VALUES (${escape(e.id)}, ${escape(e.kind)}, ${escape(e.name)}, ${escape(e.identifiers)}, ${escape(e.attributes)}, ${escape(e.sourceIds)}, ${escape(e.updatedAt)});\n`);
}

console.log(`Escribiendo ${records.length} registros...`);
for (const r of records) {
  stream.write(`INSERT OR REPLACE INTO records (id, kind, source_id, title, description, occurred_at, period_json, subject_entity_ids_json, object_entity_ids_json, amount_json, evidence_json, data_json) VALUES (${escape(r.id)}, ${escape(r.kind)}, ${escape(r.sourceId)}, ${escape(r.title)}, ${escape(r.description)}, ${escape(r.occurredAt)}, ${escape(r.period)}, ${escape(r.subjectEntityIds)}, ${escape(r.objectEntityIds)}, ${escape(r.amount)}, ${escape(r.evidence)}, ${escape(r.data)});\n`);
}

console.log(`Escribiendo ${relations.length} relaciones...`);
for (const r of relations) {
  stream.write(`INSERT OR REPLACE INTO relations (id, from_id, predicate, to_id, evidence_record_ids_json, period_json, reconciliation_json, disclaimer) VALUES (${escape(r.id)}, ${escape(r.fromId)}, ${escape(r.predicate)}, ${escape(r.toId)}, ${escape(r.evidenceRecordIds)}, ${escape(r.period)}, ${escape(r.reconciliation)}, ${escape(r.disclaimer)});\n`);
}

stream.write("\nCOMMIT;\n");
stream.end();

stream.on("finish", () => {
  console.log(`SQL generado exitosamente en ${sqlPath} (${fs.statSync(sqlPath).size / 1024 / 1024} MB)`);
});
