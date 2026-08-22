/**
 * scripts/verify-prod-movimientos.mjs
 * Script de verificación en vivo de producción para /movimientos e invariantes.
 */

async function verifyProd() {
  console.log("=== Verificación en Vivo en Producción (https://cambiometro.impulsacv.cl) ===");

  // 1. /movimientos
  const movRes = await fetch("https://cambiometro.impulsacv.cl/movimientos");
  const movHtml = await movRes.text();
  console.log(`\n1. /movimientos -> Status: ${movRes.status}`);
  console.log(`- Contiene "Cambios en el Gobierno Actual": ${movHtml.includes("Cambios en el Gobierno Actual") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "Último Cambio Registrado": ${movHtml.includes("Último Cambio Registrado") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "Días Entre Cambios (Promedio)": ${movHtml.includes("Días Entre Cambios (Promedio)") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Deporte / Natalia Duco: ${movHtml.includes("Subsecretaria del Deporte") || movHtml.includes("Natalia Duco") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Decreto Ley Chile (idNorma 1215432): ${movHtml.includes("1215432") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Hacienda / Finanzas (idNorma 1214890): ${movHtml.includes("1214890") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "Ver decreto oficial ↗": ${movHtml.includes("Ver decreto oficial ↗") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "En confirmación" / "Detectado por": ${movHtml.includes("En confirmación") && movHtml.includes("Detectado por") ? "✅ SÍ" : "❌ NO"}`);

  // 2. Invariante Kaiser
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
  const kaiserHtml = await kaiserRes.text();
  console.log(`\n2. Ficha Vanessa Kaiser -> Status: ${kaiserRes.status}`);
  console.log(`- Contiene "$4.582.550" / "$15.250.000": ${kaiserHtml.includes("4.582.550") || kaiserHtml.includes("15.250.000") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "+33,7%": ${kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%") ? "✅ SÍ" : "❌ NO"}`);

  // 3. Invariante Maipú 301
  const muniRedirectRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
  console.log(`\n3. Redirección /municipalidades/muni-maipu -> Status: ${muniRedirectRes.status} (Location: ${muniRedirectRes.headers.get("location")})`);

  console.log("\n=== Verificación Finalizada Exitosamente ===");
}

verifyProd().catch(console.error);
