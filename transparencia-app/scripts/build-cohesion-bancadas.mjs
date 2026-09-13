import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCohesionRows } from "../lib/cohesion-bancadas.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = JSON.parse(await readFile(join(root, "data", "politicos-votaciones.json"), "utf8"));
const { POLITICOS_SEED } = await import("../lib/politicos-source.ts");
const { PARTIDOS_CONFIG } = await import("../lib/partidos.config.ts");
const rows = buildCohesionRows(POLITICOS_SEED, source, Object.values(PARTIDOS_CONFIG));
if (!rows.length) throw new Error("COHESION_RELEASE_EMPTY");
if (rows.some((row) => row.cohesion_pct == null || row.cohesion_pct < 0 || row.cohesion_pct > 100)) throw new Error("COHESION_RANGE_INVALID");
const content = `${JSON.stringify(rows, null, 2)}\n`;
await mkdir(join(root, "data"), { recursive: true });
await mkdir(join(root, "public", "data"), { recursive: true });
await writeFile(join(root, "data", "cohesion-bancadas.json"), content);
await writeFile(join(root, "public", "data", "cohesion-bancadas.json"), content);
console.log(JSON.stringify({ rows: rows.length, sessions: Object.keys(source.sessions ?? {}).length, output: "data/cohesion-bancadas.json" }));
