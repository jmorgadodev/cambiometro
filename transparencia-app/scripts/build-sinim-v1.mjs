import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT = "data/lake/projections/v1/sinim.json";
const ROOT = "data/lake/partitions/sinim";

function findManifests(root, out = []) {
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) findManifests(p, out);
    else if (e.name === "manifest.json") out.push(p);
  }
  return out;
}

const municipios = new Map();

for (const mPath of findManifests(ROOT)) {
  const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
  const rf = path.basename(m.artifacts[0].key);
  const t = zlib.gunzipSync(fs.readFileSync(path.join(path.dirname(mPath), rf))).toString();
  for (const line of t.split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const d = r.data || {};
    const entityId = Array.isArray(d.subject_entity_ids) ? d.subject_entity_ids[0] : null;
    if (!entityId || !d.municipality_code) continue;
    if (!municipios.has(entityId)) {
      municipios.set(entityId, {
        id: entityId,
        code: d.municipality_code,
        name: d.municipality_name || entityId,
        indicators: [],
      });
    }
    const mun = municipios.get(entityId);
    mun.indicators.push({
      code: d.metric_code,
      label: d.metric_label || d.title || d.metric_code,
      kind: r.kind,
      value: d.value ?? null,
      monto_clp: typeof d.monto_clp === "number" ? d.monto_clp : null,
      unit: d.original_unit ?? null,
      period: d.period ?? null,
      url: d.url ?? null,
    });
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: "lake:sinim",
  period: "2025",
  total: municipios.size,
  municipios: [...municipios.values()]
    .map((mun) => ({ ...mun, indicators: mun.indicators.sort((a, b) => a.code.localeCompare(b.code)) }))
    .sort((a, b) => a.code.localeCompare(b.code)),
};

fs.writeFileSync(OUT, JSON.stringify(out));
console.log("municipios:", out.total, "| indicadores por municipio:", out.municipios[0]?.indicators.length, "| modulos:", municipios.size === 345 ? "OK 345/345" : "FALTAN");