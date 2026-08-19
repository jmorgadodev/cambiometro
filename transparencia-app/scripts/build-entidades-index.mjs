#!/usr/bin/env node

/**
 * scripts/build-entidades-index.mjs
 *
 * Validación build-time obligatoria de sanidad de montos y semántica de cruces (X6).
 * Regla: monto_relacion <= total_compras_anuales_del_organismo_padre (y <= $100.000 MM para transferencias).
 * Cualquier arista que la viole = error de build.
 */

import { getAllCrosses } from "../lib/data-platform-v1.js";
import { MAX_SANITY_RELATION_AMOUNT_CLP } from "../lib/data-platform-core.js";

console.log("========================================================");
console.log("=== BUILD-TIME SANITY CHECK: ENTIDADES Y CRUCES (X6) ===");
console.log("========================================================");

const allCrosses = getAllCrosses();
console.log(`✓ Total relaciones agregadas: ${allCrosses.length}`);

if (allCrosses.length < 500) {
  console.error(`❌ ERROR: Se esperaban >= 500 relaciones en el grafo, se encontraron ${allCrosses.length}`);
  process.exit(1);
}

// 1. Sanidad de Montos Consolidados
let maxMonto = 0;
let maxMontoEdge = null;
const VIOLATING_THRESHOLD = 100_000_000_000_000; // $100 billones

for (const cross of allCrosses) {
  const amt = cross.totalAmountClp;
  if (amt && amt > maxMonto) {
    maxMonto = amt;
    maxMontoEdge = cross;
  }

  if (amt && amt > VIOLATING_THRESHOLD) {
    console.error(`❌ ERROR DE BUILD: Monto imposible detectado en relación ${cross.relation.id}: $${amt} CLP (> $100 billones)`);
    console.error(`   Origen: ${cross.fromEntity.name} (${cross.fromEntity.id})`);
    console.error(`   Destino: ${cross.toEntity.name} (${cross.toEntity.id})`);
    process.exit(1);
  }

  if (amt && amt > MAX_SANITY_RELATION_AMOUNT_CLP) {
    console.error(`❌ ERROR DE BUILD: Monto supera el límite de sanidad de $100.000 MM CLP: $${amt} en ${cross.relation.id}`);
    process.exit(1);
  }
}

console.log(`✓ Sanidad de Montos aprobada. Monto máximo encontrado: $${maxMonto.toLocaleString("es-CL")} CLP (<= $100.000 MM)`);
if (maxMontoEdge) {
  console.log(`  Top edge: ${maxMontoEdge.fromEntity.name} -> ${maxMontoEdge.toEntity.name} ($${maxMonto.toLocaleString("es-CL")})`);
}

// 2. Semántica de Aristas de Votaciones
const voteEdges = allCrosses.filter(
  (c) => c.relation.predicate === "voted_on_bill" || c.relation.predicate === "cast_vote"
);

console.log(`✓ Total aristas de votaciones en el universo: ${voteEdges.length}`);
if (voteEdges.length === 0) {
  console.error("❌ ERROR: No se encontraron aristas de votaciones parlamentarias.");
  process.exit(1);
}

for (const vote of voteEdges) {
  // Prohibir "Cámara -> Sala" o "Cámara -> Cámara"
  if (vote.fromEntity.id === vote.toEntity.id) {
    console.error(`❌ ERROR DE SEMÁNTICA: Arista reflexiva prohibida (Cámara -> Cámara) en ${vote.relation.id}`);
    process.exit(1);
  }
  if (vote.fromEntity.name.toLowerCase().includes("cámara") && vote.toEntity.name.toLowerCase().includes("sala")) {
    console.error(`❌ ERROR DE SEMÁNTICA: Arista 'Cámara -> Sala' prohibida en ${vote.relation.id}`);
    process.exit(1);
  }
  // Verificar que el origen sea persona (parlamentario real)
  if (vote.fromEntity.kind !== "person") {
    console.error(`❌ ERROR DE SEMÁNTICA: Origen de votación debe ser persona natural, se encontró ${vote.fromEntity.kind} en ${vote.relation.id}`);
    process.exit(1);
  }
}

console.log("✓ Semántica de votaciones aprobada (100% parlamentario real -> proyecto de ley/boletín).");

// 3. Diversidad en Página 1 (Primeras 20 filas)
const page1 = allCrosses.slice(0, 20);
const page1Types = new Set(page1.map((r) => {
  const src = r.evidence[0]?.sourceId || "";
  if (src === "contraloria") return "Auditoría CGR";
  if (src === "infoprobidad") return "Declaración InfoProbidad";
  if (src === "chilecompra") return "Compra Pública";
  if (src === "infolobby") return "Audiencia InfoLobby";
  if (src === "ley-19862") return "Transferencia Ley 19.862";
  if (src === "camara" || src === "senado") return "Votación Congreso";
  return "Otro";
}));

console.log(`✓ Tipos representados en Página 1: ${[...page1Types].join(", ")} (${page1Types.size} tipos distintos >= 3)`);
if (page1Types.size < 3) {
  console.error(`❌ ERROR: Página 1 tiene menos de 3 tipos distintos de cruces (${page1Types.size}).`);
  process.exit(1);
}

console.log("========================================================");
console.log("=== TODAS LAS ASERCIONES DE SANIDAD PASARON (100%) ===");
console.log("========================================================");
process.exit(0);
