import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validateFeaturedVotes(source, featured) {
  const sessions = source.sessions ?? {};
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const failures = [];
  const seen = new Set();
  for (const item of featured) {
    if (seen.has(item.votacion_id)) failures.push(`${item.votacion_id}: destacada duplicada`);
    seen.add(item.votacion_id);
    const session = sessions[item.votacion_id];
    if (!session) { failures.push(`${item.votacion_id}: sesión inexistente`); continue; }
    if (session.boletin !== item.boletin) failures.push(`${item.votacion_id}: boletín no coincide`);
    let officialUrl = false;
    try {
      const url = new URL(item.fuente_url);
      officialUrl = url.protocol === "https:" && !url.username && !url.password
        && ["bcn.cl", "camara.cl", "senado.cl"].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    } catch { /* URL no interpretable: se retiene el candidato. */ }
    if (!officialUrl) failures.push(`${item.votacion_id}: fuente no oficial`);
    if (String(item.resumen).split(/[.!?]+/).filter(Boolean).length < 2) failures.push(`${item.votacion_id}: resumen debe ser factual y de 2-3 frases`);
    const official = normalize(session.resultado);
    // Las cifras simples no acreditan un quórum legal ni sustituyen el resultado oficial.
    if (!["aprobado", "rechazado"].includes(official) || normalize(item.resultado) !== official) failures.push(`${item.votacion_id}: resultado no coincide con la fuente oficial`);
    if (/⭐|🌟|✨|😀|🎉/.test(`${item.titulo} ${item.resumen}`)) failures.push(`${item.votacion_id}: emoji decorativo no permitido`);
  }
  if (featured.length < 8 || featured.length > 10) failures.push(`cantidad destacadas inválida: ${featured.length}`);
  return failures;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const source = JSON.parse(await readFile(join(root, "data/politicos-votaciones.json"), "utf8"));
  const featured = JSON.parse(await readFile(join(root, "data/votaciones-destacadas.json"), "utf8"));
  const failures = validateFeaturedVotes(source, featured);
  if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
  else console.log(`Highlighted votes guard passed: ${featured.length} entries.`);
}
