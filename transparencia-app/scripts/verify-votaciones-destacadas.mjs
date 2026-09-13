import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = JSON.parse(await readFile(join(root, "data", "politicos-votaciones.json"), "utf8"));
const featured = JSON.parse(await readFile(join(root, "data", "votaciones-destacadas.json"), "utf8"));
const sessions = source.sessions ?? {};
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const failures = [];
for (const item of featured) {
  const session = sessions[item.votacion_id];
  if (!session) { failures.push(`${item.votacion_id}: sesión inexistente`); continue; }
  if (session.boletin !== item.boletin) failures.push(`${item.votacion_id}: boletín no coincide`);
  if (!/^https:\/\/(?:[^/]+\.)?(?:bcn\.cl|camara\.cl|senado\.cl)/i.test(item.fuente_url)) failures.push(`${item.votacion_id}: fuente no oficial`);
  if (String(item.resumen).split(/[.!?]+/).filter(Boolean).length < 2) failures.push(`${item.votacion_id}: resumen debe ser factual y de 2-3 frases`);
  const si = Number(session.total_si || 0);
  const no = Number(session.total_no || 0);
  const expected = si >= no ? "Aprobado" : "Rechazado";
  if (normalize(item.resultado) !== normalize(expected)) failures.push(`${item.votacion_id}: resultado ${item.resultado} != ${expected}`);
  if (/⭐|🌟|✨|😀|🎉/.test(`${item.titulo} ${item.resumen}`)) failures.push(`${item.votacion_id}: emoji decorativo no permitido`);
}
if (featured.length < 8 || featured.length > 10) failures.push(`cantidad destacadas inválida: ${featured.length}`);
if (failures.length) { console.error(failures.map((failure) => `❌ ${failure}`).join("\n")); process.exit(1); }
console.log(`Highlighted votes guard passed: ${featured.length} entries.`);
