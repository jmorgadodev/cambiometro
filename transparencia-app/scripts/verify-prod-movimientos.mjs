/**
 * scripts/verify-prod-movimientos.mjs
 * Script de verificación en vivo de producción para /movimientos e invariantes (Tarea H v5).
 */

async function verifyProd() {
  console.log("=== Verificación en Vivo en Producción (https://cambiometro.impulsacv.cl) ===");

  // 1. /movimientos
  const movRes = await fetch("https://cambiometro.impulsacv.cl/movimientos");
  const movHtml = await movRes.text();
  console.log(`\n1. /movimientos -> Status: ${movRes.status}`);
  console.log(`- Contiene "Cambios en el Gobierno Actual": ${movHtml.includes("Cambios en el Gobierno Actual") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene desglose "salidas": ${movHtml.includes("salidas") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene botón "Compartir": ${movHtml.includes("Compartir") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene nota metodológica sobre salidas y decretos: ${movHtml.includes("Las salidas se contrastan con registros públicos") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene SEGEGOB / Mara Sedini: ${movHtml.includes("Mara Sedini") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene SEGEGOB / Claudio Alvarado: ${movHtml.includes("Claudio Alvarado") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- CERO menciones de "Müller" (Gonzalo Müller): ${!movHtml.toLowerCase().includes("müller") && !movHtml.toLowerCase().includes("muller") ? "✅ SÍ (0 Müller)" : "❌ NO"}`);
  console.log(`- Contiene Deporte / Francisco Riveros: ${movHtml.includes("Francisco Riveros") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Deporte / Sofía Rengifo: ${movHtml.includes("Sofía Rengifo") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Mujer / Marcia Raphael: ${movHtml.includes("Marcia Raphael") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene Ciencia / Carolina Rossi: ${movHtml.includes("Carolina Rossi") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Cero typos 'Subrogente' (Normalizado a Subrogante): ${!movHtml.toLowerCase().includes("subrogente") ? "✅ SÍ" : "❌ NO"}`);

  // 2. /servicios-publicos
  const servRes = await fetch("https://cambiometro.impulsacv.cl/servicios-publicos");
  const servHtml = await servRes.text();
  console.log(`\n2. /servicios-publicos -> Status: ${servRes.status}`);
  console.log(`- SEGEGOB con Claudio Alvarado: ${servHtml.includes("Claudio Alvarado") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Deporte con Francisco Riveros: ${servHtml.includes("Francisco Riveros") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- CERO menciones de "Müller": ${!servHtml.toLowerCase().includes("müller") && !servHtml.toLowerCase().includes("muller") ? "✅ SÍ" : "❌ NO"}`);

  // 3. Invariante Kaiser
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
  const kaiserHtml = await kaiserRes.text();
  console.log(`\n3. Ficha Vanessa Kaiser -> Status: ${kaiserRes.status}`);
  console.log(`- Contiene "$4.582.550" / "$15.250.000": ${kaiserHtml.includes("4.582.550") || kaiserHtml.includes("15.250.000") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "+33,7%": ${kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%") ? "✅ SÍ" : "❌ NO"}`);

  // 4. Invariante Maipú 301
  const muniRedirectRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
  console.log(`\n4. Redirección /municipalidades/muni-maipu -> Status: ${muniRedirectRes.status} (Location: ${muniRedirectRes.headers.get("location")})`);

  console.log("\n=== Verificación Finalizada ===");
}

verifyProd().catch(console.error);
