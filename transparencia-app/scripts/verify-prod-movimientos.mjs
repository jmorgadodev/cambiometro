/**
 * scripts/verify-prod-movimientos.mjs
 * Script de verificación en vivo de producción para /movimientos e invariantes (Tarea H v4).
 */

async function verifyProd() {
  console.log("=== Verificación en Vivo en Producción (https://cambiometro.impulsacv.cl) ===");

  // 1. /movimientos
  const movRes = await fetch("https://cambiometro.impulsacv.cl/movimientos");
  const movHtml = await movRes.text();
  console.log(`\n1. /movimientos -> Status: ${movRes.status}`);
  console.log(`- Contiene "Cambios en el Gobierno Actual": ${movHtml.includes("Cambios en el Gobierno Actual") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene desglose "salidas": ${movHtml.includes("salidas") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "Último Cambio Registrado": ${movHtml.includes("Último Cambio Registrado") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "Días Entre Cambios (Promedio)": ${movHtml.includes("Días Entre Cambios (Promedio)") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene botón "Compartir": ${movHtml.includes("Compartir") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene nota metodológica sobre salidas y decretos: ${movHtml.includes("Las salidas se contrastan con registros públicos") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene SEGEGOB / Mara Sedini (D1): ${movHtml.includes("Mara Sedini") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Hacienda / Vallebona / Bunster (D2): ${movHtml.includes("Vallebona") || movHtml.includes("Bunster") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Riveros / Rengifo (D3): ${movHtml.includes("Riveros") || movHtml.includes("Rengifo") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Deporte / Natalia Duco: ${movHtml.includes("Natalia Duco") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Cero typos 'Subrogente' (Normalizado a Subrogante): ${!movHtml.toLowerCase().includes("subrogente") ? "✅ SÍ" : "❌ NO"}`);

  // 2. Invariante Kaiser
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
  const kaiserHtml = await kaiserRes.text();
  console.log(`\n2. Ficha Vanessa Kaiser -> Status: ${kaiserRes.status}`);
  console.log(`- Contiene "$4.582.550" / "$15.250.000": ${kaiserHtml.includes("4.582.550") || kaiserHtml.includes("15.250.000") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "+33,7%": ${kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%") ? "✅ SÍ" : "❌ NO"}`);

  // 3. Invariante Maipú 301
  const muniRedirectRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
  console.log(`\n3. Redirección /municipalidades/muni-maipu -> Status: ${muniRedirectRes.status} (Location: ${muniRedirectRes.headers.get("location")})`);

  console.log("\n=== Verificación Finalizada ===");
}

verifyProd().catch(console.error);
