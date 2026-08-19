import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const projectRoot = join(process.cwd());
const SQL_FILE = join(projectRoot, "scripts", "db", "seed-politicos-cache.sql");

console.log("Generando seed de politico_data_cache...");

let stats: Record<string, unknown> = {};

try {
  stats = JSON.parse(readFileSync(join(projectRoot, "data", "politicos-evidences-stats.json"), "utf8"));
} catch (e) {
  console.log("No se pudo cargar politicos-evidences-stats.json");
}

// Recopilar todos los IDs de politicos
const politicoIds = new Set<string>();
for (const id of Object.keys(stats)) politicoIds.add(id);
// No podemos iterar sobre personal fácilmente porque usa IDs de cámara/nombres, pero stats ya tiene a todos los politicos.

const escapeSql = (str: string) => str.replace(/'/g, "''");

let sql = `DELETE FROM politico_data_cache;\n`;

for (const id of politicoIds) {
  const pStats = stats[id] || null;
  const pGastos = null; 
  const pVotaciones = null; 
  
  // Buscar personal (simplificado para el script, la app usaba helpers. Lo inyectaremos por separado o no lo guardamos si la app usa los JSON importados)
  // Wait, the app currently IMPORTS personalApoyoData from JSON statically.
  // We can just store stats and remuneracion for now.
  const pRemuneracion = null;

  sql += `INSERT INTO politico_data_cache (politico_id, gastos_json, votaciones_json, stats_json, personal_json, remuneracion_json) VALUES (`;
  sql += `'${escapeSql(id)}', `;
  sql += `NULL, `;
  sql += `NULL, `;
  sql += pStats ? `'${escapeSql(JSON.stringify(pStats))}', ` : `NULL, `;
  sql += `NULL, `;
  sql += pRemuneracion ? `'${escapeSql(JSON.stringify(pRemuneracion))}'` : `NULL`;
  sql += `);\n`;
}

writeFileSync(SQL_FILE, sql, "utf8");
console.log(`Generado ${SQL_FILE} con ${politicoIds.size} registros.`);
