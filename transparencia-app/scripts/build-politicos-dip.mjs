import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const politicosText = fs.readFileSync(path.join(appRoot, "lib", "politicos-source.ts"), "utf8");
const politicos = [];
const blockRegex = /\{\s*id:\s*"([^"]+)",\s*nombre_completo:\s*"([^"]+)"[\s\S]*?cargo:\s*"([^"]+)"[\s\S]*?fuente:\s*"([^"]+)"\s*\}/g;
let match;
while ((match = blockRegex.exec(politicosText)) !== null) {
  politicos.push({ id: match[1], nombre: match[2], cargo: match[3] });
}

function normalize(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchPolitician(recName, pol) {
  const normRec = normalize(recName);
  const normPol = normalize(pol.nombre);

  if (normRec === normPol) return true;
  if (normRec.includes(normPol) || normPol.includes(normRec)) return true;

  const polTokens = normPol.split(/\s+/).filter((t) => t.length > 2);
  const recTokens = normRec.split(/\s+/).filter((t) => t.length > 2);

  if (polTokens.length >= 3) {
    const pLastName1 = polTokens[polTokens.length - 2];
    const pLastName2 = polTokens[polTokens.length - 1];
    const pFirstName = polTokens[0];

    const hasBothSurnames = recTokens.includes(pLastName1) && recTokens.includes(pLastName2);
    const hasFirstName = recTokens.includes(pFirstName);

    if (hasBothSurnames && hasFirstName) return true;
  }

  return false;
}

const base = path.join(appRoot, "data", "lake", "partitions", "infoprobidad", "2026");
const months = fs.existsSync(base) ? fs.readdirSync(base) : [];

const dipMap = new Map();

for (const m of months) {
  const p = path.join(base, m, "records.jsonl.gz");
  if (!fs.existsSync(p)) continue;
  const content = zlib.gunzipSync(fs.readFileSync(p)).toString("utf8");
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const data = parsed.data || {};
    const recName = data.nombre || "";

    for (const pol of politicos) {
      if (matchPolitician(recName, pol)) {
        const existing = dipMap.get(pol.id) || [];
        existing.push({
          date: data.fecha,
          url: data.url,
          nombre_record: recName,
          declaracion: data.declaracion,
        });
        dipMap.set(pol.id, existing);
      }
    }
  }
}

function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (["de", "en", "y", "del", "la", "el", "los", "las"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

const result = {};

for (const pol of politicos) {
  const decls = dipMap.get(pol.id) || [];
  decls.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latest = decls[0];
  const profObj = latest?.declaracion?.Datos_del_Declarante?.Profesion_Oficio;
  const rawProf = profObj?.nombre ? String(profObj.nombre).trim() : null;

  let profesion_oficio_display = "No declarado en DIP";
  let formacion_titulos_display = "No declarado en DIP";

  if (latest && rawProf) {
    if (rawProf.toUpperCase() === "OTRA" || profObj?.id === 54) {
      profesion_oficio_display = "Otra";
      formacion_titulos_display = "No registra títulos de educación superior";
    } else {
      const formatted = toTitleCase(rawProf);
      profesion_oficio_display = formatted;
      formacion_titulos_display = formatted;
    }
  }

  const declaracion_url = latest?.url || `https://www.infoprobidad.cl/Resultados?busqueda=${encodeURIComponent(pol.nombre)}`;

  result[pol.id] = {
    politico_id: pol.id,
    nombre_completo: pol.nombre,
    tiene_declaracion: !!latest,
    profesion_oficio_raw: rawProf,
    profesion_oficio_display,
    formacion_titulos_display,
    declaracion_fecha: latest?.date || null,
    declaracion_url,
  };
}

const outPath = path.join(appRoot, "data", "politicos-dip.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
console.log(`Successfully generated DIP data for ${Object.keys(result).length} politicians to ${outPath}`);
