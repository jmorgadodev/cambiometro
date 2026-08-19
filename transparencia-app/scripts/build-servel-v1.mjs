import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const OUT = "data/lake/projections/v1/servel.json";
const ROOT = "data/lake/partitions/servel";

function findManifests(root, out = []) {
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) findManifests(p, out);
    else if (e.name === "manifest.json") out.push(p);
  }
  return out;
}

const candidatos = new Map();
const pactos = new Map();

for (const mPath of findManifests(ROOT)) {
  const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
  const rf = path.basename(m.artifacts[0].key);
  const t = zlib.gunzipSync(fs.readFileSync(path.join(path.dirname(mPath), rf))).toString();
  for (const line of t.split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const d = r.data ?? {};
    const cand = d.candidate;
    if (!cand || !cand.entity_id) continue;
    const ballot = d.ballot ?? {};
    const geo = d.geography ?? {};
    const id = cand.entity_id;
    if (!candidatos.has(id)) {
      candidatos.set(id, {
        id,
        name: cand.name ?? cand.entity_id,
        official_id: cand.official_id ?? null,
        contest: d.contest,
        pact: ballot.pact ?? null,
        pact_letter: ballot.pact_letter ?? null,
        party: ballot.party ?? null,
        subpact: ballot.subpact ?? null,
        elected: false,
        votes_total: 0,
        distrito: typeof geo.district === "string" ? geo.district : null,
        circumscripcion: typeof geo.senatorial_constituency === "string" ? geo.senatorial_constituency : null,
        regiones: new Set(),
        porGeo: new Map(),
      });
    }
    const c = candidatos.get(id);
    c.votes_total += Number.isFinite(d.votes) ? d.votes : 0;
    if (d.nominated_elected === true) c.elected = true;
    if (typeof geo.region === "string") c.regiones.add(geo.region);
    const key = d.contest === "deputies" ? (geo.district || geo.region) : geo.region;
    if (typeof key === "string") {
      c.porGeo.set(key, (c.porGeo.get(key) ?? 0) + (Number.isFinite(d.votes) ? d.votes : 0));
    }
    const pactKey = `${d.contest}|${ballot.pact}`;
    if (!pactos.has(pactKey)) {
      pactos.set(pactKey, { contest: d.contest, pact: ballot.pact ?? "Sin pacto", pact_letter: ballot.pact_letter ?? null, votes_total: 0, candidatos: 0, electos: 0 });
    }
    const p = pactos.get(pactKey);
    p.votes_total += Number.isFinite(d.votes) ? d.votes : 0;
  }
}

for (const c of candidatos.values()) {
  const pactKey = `${c.contest}|${c.pact}`;
  const p = pactos.get(pactKey);
  if (p) {
    p.candidatos++;
    if (c.elected) p.electos++;
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  source: "lake:servel",
  election_date: "2025-11-16",
  total_candidatos: candidatos.size,
  candidatos: [...candidatos.values()].map((c) => ({
    ...c,
    regiones: [...c.regiones].sort((a, b) => a.localeCompare(b, "es-CL")),
    porGeo: [...c.porGeo.entries()].map(([geo, votes]) => ({ geo, votes })).sort((a, b) => b.votes - a.votes),
  })).sort((a, b) => b.votes_total - a.votes_total),
  pactos: [...pactos.values()].filter((p) => p.contest !== "president").sort((a, b) => b.votes_total - a.votes_total),
};

fs.writeFileSync(OUT, JSON.stringify(out));
console.log("candidatos:", out.total_candidatos, "| pactos:", out.pactos.length, "| eleccion:", out.election_date);