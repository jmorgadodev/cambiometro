import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const municipalidades = JSON.parse(await readFile(resolve(root, "data/municipalidades-data.json"), "utf8"));
const municipalidadesList = JSON.parse(await readFile(resolve(root, "data/municipalidades-list.json"), "utf8"));

const detailIds = Object.keys(municipalidades);
const listIds = municipalidadesList.map((item) => item.id);
const uniqueListIds = new Set(listIds);

if (detailIds.length !== 346) throw new Error(`STATIC_MUNICIPALITIES_DETAIL_COUNT:${detailIds.length}`);
if (municipalidadesList.length !== 346) throw new Error(`STATIC_MUNICIPALITIES_LIST_COUNT:${municipalidadesList.length}`);
if (uniqueListIds.size !== 346) throw new Error(`STATIC_MUNICIPALITIES_LIST_DUPLICATES:${listIds.length - uniqueListIds.size}`);
if (detailIds.some((id) => !uniqueListIds.has(id)) || listIds.some((id) => !municipalidades[id])) {
  throw new Error("STATIC_MUNICIPALITIES_ID_UNIVERSE_MISMATCH");
}

console.log(JSON.stringify({
  source: "checked-in-fallback",
  detailCount: detailIds.length,
  listCount: municipalidadesList.length,
  uniqueIds: uniqueListIds.size,
}, null, 2));
