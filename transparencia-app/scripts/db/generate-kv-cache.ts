import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const projectRoot = join(process.cwd());
const SQL_FILE = join(projectRoot, "scripts", "db", "seed-kv-cache.sql");

console.log("Generando seed de kv_cache...");

const escapeSql = (str: string) => str.replace(/'/g, "''");

const files = [
  "personal-apoyo.json",
  "remuneraciones-38bis.json",
  "partidos-stats.json"
];

let fileCounter = 1;

for (const filename of files) {
  try {
    const content = readFileSync(join(projectRoot, "data", filename), "utf8");
    const CHUNK_SIZE = 100000;
    const numChunks = Math.ceil(content.length / CHUNK_SIZE);
    
    for (let i = 0; i < numChunks; i++) {
      const chunk = content.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkKey = numChunks === 1 ? filename : `${filename}-part${i}`;
      const chunkSql = `INSERT INTO kv_cache (key, value_json) VALUES ('${escapeSql(chunkKey)}', '${escapeSql(chunk)}');\n`;
      writeFileSync(join(projectRoot, "scripts", "db", `seed-kv-cache-${fileCounter}.sql`), chunkSql, "utf8");
      fileCounter++;
    }
    console.log(`Incluido ${filename} (${content.length} bytes, ${numChunks} chunks)`);
  } catch (e) {
    console.error(`Error procesando ${filename}:`, e);
  }
}

console.log(`Generados ${fileCounter - 1} archivos SQL en scripts/db/`);
