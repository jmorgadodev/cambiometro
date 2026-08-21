import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { normalizeProjectionContract, sumKnownAmounts } from "./etl/chilecompra-projection.mjs";

const OUT = "data/lake/projections/v1/chilecompra.json";
const ROOT = "data/lake/partitions/chilecompra";

function findManifests(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) findManifests(p, out);
    else if (e.name === "manifest.json") out.push(p);
  }
  return out;
}

function readLines(mPath) {
  const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
  const rf = path.basename(m.artifacts[0].key);
  const t = zlib.gunzipSync(fs.readFileSync(path.join(path.dirname(mPath), rf))).toString();
  return t.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const buyerByOcid = new Map();
const buyerById = new Map();
const suppliers = new Map();
const pairs = new Map();
const seenContractIds = new Set();
const seenBuyerContracts = new Map(); // buyerId -> Set of ocids

// 1. Index Buyers
for (const mPath of findManifests(ROOT)) {
  for (const r of readLines(mPath)) {
    const d = r.data || {};
    if (r.kind === "purchase" && d.buyer && typeof d.buyer === "object") {
      const passT = d.ocid || "";
      const id = "public-body-chilecompra-rut-" + String(d.buyer.rut_juridico || "").replace(/\D/g, "");
      if (id.length < 10) continue;
      if (!buyerById.has(id)) {
        const name = String(d.buyer.legal_name || d.buyer.name || "").split("|").map((s) => s.trim()).find((s) => s) || null;
        buyerById.set(id, {
          id,
          name,
          rut_juridico: d.buyer.rut_juridico || null,
          months: new Map(),
          top: [],
          procesos: 0,
        });
        seenBuyerContracts.set(id, new Set());
      }
      if (passT) buyerByOcid.set(passT, id);
    }
  }
}

// 2. Index Contracts with Strict Deduplication
for (const mPath of findManifests(ROOT)) {
  for (const r of readLines(mPath)) {
    const d = r.data || {};
    if (r.kind !== "contract") continue;

    // Deduplicate by record ID
    const recId = r.id || `contract-${createHash("sha256").update(JSON.stringify(d)).digest("hex")}`;
    if (seenContractIds.has(recId)) continue;
    seenContractIds.add(recId);

    const normalized = normalizeProjectionContract(d);
    const monto = normalized.monto_clp;
    const ocid = d.ocid || d.process_id || "";
    const buyerId = buyerByOcid.get(ocid) || null;
    const period = d.period;
    const provId = normalized.proveedor_id;
    const provName = normalized.proveedor;

    if (provId && provName && monto !== null) {
      if (!suppliers.has(provId)) {
        suppliers.set(provId, { id: provId, name: provName, monto_total_clp: 0, procesos: 0, buyers: new Set() });
      }
      const sp = suppliers.get(provId);
      sp.monto_total_clp += monto;
      sp.procesos++;
      if (buyerId) sp.buyers.add(buyerId);
    }

    if (!buyerId || !buyerById.has(buyerId)) continue;
    const b = buyerById.get(buyerId);
    const buyerSeen = seenBuyerContracts.get(buyerId);

    // Evitar duplicados exactos en el buyer (mismo ocid + titulo)
    const buyerContractKey = `${ocid}|${String(d.title || "").trim().toLowerCase()}`;
    if (buyerSeen.has(buyerContractKey)) continue;
    buyerSeen.add(buyerContractKey);

    b.procesos++;

    if (period) {
      if (!b.months.has(period)) b.months.set(period, { period, monto_total_clp: null, procesos: 0 });
      const mo = b.months.get(period);
      if (monto !== null) mo.monto_total_clp = (mo.monto_total_clp ?? 0) + monto;
      mo.procesos++;
    }

    b.top.push({
      title: normalized.title?.slice(0, 180) ?? null,
      proveedor: provName,
      proveedor_id: provId,
      monto_clp: monto,
      fecha: d.fecha || null,
      url: d.url || (ocid ? `https://api.mercadopublico.cl/APISOCDS/OCDS/award/${ocid.replace(/^ocds-70d2nz-/, "")}` : null),
      ocid,
    });

    if (provId && provName && monto !== null) {
      const pairKey = `${buyerId}|${provId}`;
      if (!pairs.has(pairKey)) pairs.set(pairKey, { buyerId, provId, monto_total_clp: 0, procesos: 0 });
      const pair = pairs.get(pairKey);
      pair.monto_total_clp += monto;
      pair.procesos++;
    }
  }
}

const buyers = [...buyerById.values()]
  .map((b) => {
    // Ordenar todas las compras por fecha descendente y monto descendente
    const sortedTop = b.top.sort((a, c) => {
      if (c.monto_clp !== null && a.monto_clp !== null && c.monto_clp !== a.monto_clp) {
        return c.monto_clp - a.monto_clp;
      }
      return String(c.fecha || "").localeCompare(String(a.fecha || ""));
    });

    const sumMonths = sumKnownAmounts([...b.months.values()].map((month) => month.monto_total_clp));
    const sumTop = sumKnownAmounts(sortedTop.map((item) => item.monto_clp));
    const monto_total_clp = sumMonths === null ? sumTop : sumTop === null ? sumMonths : Math.max(sumMonths, sumTop);

    return {
      id: b.id,
      name: b.name,
      rut_juridico: b.rut_juridico,
      monto_total_clp,
      procesos: Math.max(b.procesos, sortedTop.length),
      months: [...b.months.values()].sort((a, c) => (a.period < c.period ? 1 : -1)).slice(0, 12),
      top: sortedTop.slice(0, 8), // Top 8 compras deduplicadas por comprador
    };
  })

  .sort((a, c) => (c.monto_total_clp ?? Number.NEGATIVE_INFINITY) - (a.monto_total_clp ?? Number.NEGATIVE_INFINITY));

const suppliersTop = [...suppliers.values()]
  .map((s) => ({ ...s, buyers: s.buyers.size }))
  .sort((a, c) => c.monto_total_clp - a.monto_total_clp)
  .slice(0, 1000);

const topPairs = [...pairs.values()]
  .sort((a, c) => c.monto_total_clp - a.monto_total_clp)
  .slice(0, 300)
  .map((p) => ({ buyerId: p.buyerId, provId: p.provId, monto_total_clp: p.monto_total_clp, procesos: p.procesos }));

const out = {
  generatedAt: new Date().toISOString(),
  source: "lake:chilecompra",
  buyers,
  suppliers: suppliersTop,
  topPairs,
  total_adjudicado_clp: sumKnownAmounts(buyers.map((buyer) => buyer.monto_total_clp)),
};

fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`✓ Generado ${OUT}`);
console.log(`  Compradores: ${buyers.length}`);
console.log(`  Proveedores: ${suppliersTop.length}`);
console.log(`  Monto Total: ${out.total_adjudicado_clp === null ? "no disponible" : `$${(out.total_adjudicado_clp / 1e12).toFixed(2)}T CLP`}`);

// Verificar comprador Las Condes
const lc = buyers.find((b) => b.name?.toLowerCase().includes("condes"));
if (lc) {
  console.log(`\n🔍 Verificación Las Condes:`);
  console.log(`  Procesos: ${lc.procesos}`);
  console.log(`  Top Compras Guardadas: ${lc.top.length}`);
  console.log(`  Primeros 3 items:`);
  lc.top.slice(0, 3).forEach((t, i) => console.log(`   ${i + 1}. [${t.ocid}] ${t.title ?? "sin título oficial"} — ${t.monto_clp === null ? "monto no publicado" : `$${t.monto_clp.toLocaleString("es-CL")}`} (${t.proveedor ?? "proveedor no publicado"})`));
}
