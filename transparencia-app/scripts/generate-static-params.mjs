import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = join(root, "data", "entidades-canonica.json");
const fallbackPath = join(root, "data", "catalog", "entities-routes.json");
const source = JSON.parse(await readFile(sourcePath, "utf8").catch(() => readFile(fallbackPath, "utf8")));
const entities = Array.isArray(source) ? source : source.entities ?? [];
await mkdir(join(root, "data", "generated"), { recursive: true });
await writeFile(join(root, "data", "generated", "entity-routes.json"), JSON.stringify(entities.map((entity) => ({ id: entity.id }))));
const recordsByEntity = new Map(entities.map((entity) => [entity.id, []]));
const relationsByEntity = new Map(entities.map((entity) => [entity.id, []]));
for (const record of source.records ?? []) {
  for (const entityId of [...(record.subjectEntityIds ?? []), ...(record.objectEntityIds ?? [])]) {
    recordsByEntity.get(entityId)?.push(record);
  }
}
for (const relation of source.relations ?? []) {
  relationsByEntity.get(relation.fromId)?.push(relation);
  if (relation.toId !== relation.fromId) relationsByEntity.get(relation.toId)?.push(relation);
}
const entityDir = join(root, "data", "generated", "entities");
await mkdir(entityDir, { recursive: true });
await Promise.all(entities.map((entity) => writeFile(
  join(entityDir, `${entity.id}.json`),
  JSON.stringify({ entity, records: recordsByEntity.get(entity.id) ?? [], relations: relationsByEntity.get(entity.id) ?? [] }),
)));
console.log(`Generated ${entities.length} canonical entity route params.`);
