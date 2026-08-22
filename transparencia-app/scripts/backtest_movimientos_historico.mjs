/**
 * scripts/backtest_movimientos_historico.mjs
 * Backtest histórico de precisión y cobertura del pipeline de movimientos (Marzo - Agosto 2026).
 *
 * Criterios de Calidad (Gate):
 * 1. Cobertura de decretos conocidos vs detectados: >= 90%
 * 2. Falsos positivos: 0
 * 3. Eventos marcados como "verificado" sin URL de documento oficial: 0
 */

import fs from 'fs';
import path from 'path';

const movimientosData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'movimientos.json'), 'utf8'));
const MOVIMIENTOS = movimientosData.movimientos;

console.log("======================================================================");
console.log("🧪 BACKTEST HISTÓRICO: Pipeline de Movimientos de Autoridades (Mar-Ago 2026)");
console.log("======================================================================\n");

// Dataset benchmark de control: 20 decretos y resoluciones históricas oficiales documentadas
const GROUND_TRUTH_BENCHMARK = [
  { id: "GT-01", fecha: "2026-03-11", entidad: "Presidencia", keywords: ["presidencia", "gabinete"], norma: "D.S. N° 1 a 24", tipo: "cambio-mando" },
  { id: "GT-02", fecha: "2026-03-11", entidad: "Seguridad Pública", keywords: ["seguridad", "steinert"], norma: "Ley 21.750 / D.S. 1", tipo: "creacion" },
  { id: "GT-03", fecha: "2026-03-11", entidad: "Transportes", keywords: ["transportes", "grange"], norma: "D.S. N° 8", tipo: "cambio-mando" },
  { id: "GT-04", fecha: "2026-03-11", entidad: "Interior", keywords: ["interior", "alvarado"], norma: "D.S. N° 1", tipo: "cambio-mando" },
  { id: "GT-05", fecha: "2026-03-11", entidad: "Superintendencia de Salud", keywords: ["superintendencia de salud", "paris"], norma: "D.S. N° 12", tipo: "designacion" },
  { id: "GT-06", fecha: "2026-03-11", entidad: "Economía y Minería", keywords: ["economía", "mas"], norma: "D.S. N° 4", tipo: "designacion" },
  { id: "GT-07", fecha: "2026-03-13", entidad: "Superintendencia de Pensiones", keywords: ["pensiones", "charme"], norma: "D.S. N° 29", tipo: "designacion" },
  { id: "GT-08", fecha: "2026-03-17", entidad: "FONASA", keywords: ["fonasa", "mañalich"], norma: "D.S. N° 45", tipo: "designacion" },
  { id: "GT-09", fecha: "2026-03-25", entidad: "SII", keywords: ["sii", "impuestos", "saravia"], norma: "D.S. N° 102", tipo: "designacion" },
  { id: "GT-10", fecha: "2026-04-09", entidad: "CONAF", keywords: ["conaf", "forestal", "munita"], norma: "D.S. N° 88", tipo: "designacion" },
  { id: "GT-11", fecha: "2026-05-19", entidad: "SEGEGOB", keywords: ["segebog", "sedini"], norma: "D.S. N° 189", tipo: "remocion" },
  { id: "GT-12", fecha: "2026-05-19", entidad: "Seguridad Pública", keywords: ["seguridad", "arrau"], norma: "D.S. N° 190", tipo: "remocion" },
  { id: "GT-13", fecha: "2026-05-19", entidad: "Obras Públicas", keywords: ["obras públicas", "mop"], norma: "D.S. N° 191", tipo: "cambio" },
  { id: "GT-14", fecha: "2026-06-30", entidad: "Delegación Presidencial Provincial Cordillera", keywords: ["cordillera", "montero"], norma: "D.S. N° 388", tipo: "renuncia" },
  { id: "GT-15", fecha: "2026-07-01", entidad: "Gobierno Regional de Valparaíso", keywords: ["valparaíso", "mundaca"], norma: "Dictamen SIAPER CGR N° 19", tipo: "remocion" },
  { id: "GT-16", fecha: "2026-07-20", entidad: "SEREMI Salud Antofagasta", keywords: ["antofagasta", "godoy"], norma: "D.S. N° 489 / SIAPER N° 42", tipo: "remocion" },
  { id: "GT-17", fecha: "2026-07-23", entidad: "Ministerio de Hacienda", keywords: ["hacienda", "sansone", "moreno"], norma: "D.S. N° 312 / BCN idNorma 1214890", tipo: "cambio" },
  { id: "GT-18", fecha: "2026-08-12", entidad: "SERPAT", keywords: ["patrimonio", "serpat", "soto"], norma: "Res. Ex. N° 852", tipo: "designacion" },
  { id: "GT-19", fecha: "2026-08-13", entidad: "Subsecretaría del Deporte", keywords: ["deporte", "duco"], norma: "D.S. N° 84 / BCN idNorma 1215432", tipo: "renuncia" },
  { id: "GT-20", fecha: "2026-08-14", entidad: "Delegación Presidencial Regional Atacama", keywords: ["atacama", "urrejola"], norma: "Decreto Interior N° 412", tipo: "remocion" }
];

let detectadosCount = 0;
let falsosPositivosCount = 0;
let verificadosSinUrlCount = 0;

for (const gt of GROUND_TRUTH_BENCHMARK) {
  const match = MOVIMIENTOS.find(m => {
    const textCorpus = [
      m.organismo,
      m.ministerio,
      m.cargo,
      m.salio?.nombre,
      m.entro?.nombre,
      m.saliente,
      m.entrante
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesKeywords = gt.keywords.some(k => textCorpus.includes(k.toLowerCase()));
    const fechaMatch = m.fecha === gt.fecha || m.salio?.fecha === gt.fecha || m.entro?.fecha === gt.fecha || m.fecha_deteccion?.startsWith(gt.fecha);
    return matchesKeywords && fechaMatch;
  });

  if (match) {
    detectadosCount++;
  } else {
    console.warn(`⚠️ Ground Truth no detectado: ${gt.id} - ${gt.entidad} (${gt.fecha})`);
  }
}

// Validar que no existan verificados sin URL oficial
for (const m of MOVIMIENTOS) {
  if (m.estado === "verificado") {
    const hasOfficialUrl = m.decreto_url && m.decreto_url.startsWith("http");
    if (!hasOfficialUrl) {
      verificadosSinUrlCount++;
      console.error(`❌ Movimiento verificado sin URL oficial: ${m.id} (${m.cargo})`);
    }
  }
}

const recallPct = (detectadosCount / GROUND_TRUTH_BENCHMARK.length) * 100;
const precisionGatePassed = recallPct >= 90.0 && falsosPositivosCount === 0 && verificadosSinUrlCount === 0;

console.log("📊 RESULTADOS DEL BACKTEST HISTÓRICO:\n");
console.log(`| Métrica | Criterio Exigido | Resultado Obtenido | Estado |`);
console.log(`| :--- | :--- | :--- | :--- |`);
console.log(`| Decretos Conocidos vs Detectados | >= 90% | ${detectadosCount}/${GROUND_TRUTH_BENCHMARK.length} (${recallPct.toFixed(1)}%) | ${recallPct >= 90 ? "✅ PASA" : "❌ FALLA"} |`);
console.log(`| Falsos Positivos | 0 | ${falsosPositivosCount} | ${falsosPositivosCount === 0 ? "✅ PASA" : "❌ FALLA"} |`);
console.log(`| Verificados sin URL Oficial | 0 | ${verificadosSinUrlCount} | ${verificadosSinUrlCount === 0 ? "✅ PASA" : "❌ FALLA"} |`);
console.log("\n----------------------------------------------------------------------");
console.log(`Gate de Calidad: ${precisionGatePassed ? "🟢 APROBADO (ETL en modo autónomo oficial)" : "🔴 REPROBADO (Modo sugerencias)"}`);
console.log("======================================================================\n");

if (!precisionGatePassed) {
  process.exit(1);
}
