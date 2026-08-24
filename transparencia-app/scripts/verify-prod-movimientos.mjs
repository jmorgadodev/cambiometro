/**
 * scripts/verify-prod-movimientos.mjs
 * Script de verificación en vivo de producción para /movimientos e invariantes (Tarea H v6 — Cierre Definitivo).
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

  // Casos Tarea H v6:
  console.log(`- 1. SEGEGOB (Sedini Viancos -> Alvarado Andrade): ${movHtml.includes("Sedini Viancos") && movHtml.includes("Alvarado Andrade") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 2. Seguridad & MOP (Steinert -> Arrau -> Louis de Grange Concha): ${movHtml.includes("Steinert") && movHtml.includes("Arrau") && movHtml.includes("Louis de Grange Concha") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 3. Ciencia 11-may (Rafael Araos Bralic -> Carolina Rossi Pantoja): ${movHtml.includes("Rafael Araos Bralic") && movHtml.includes("Carolina Rossi Pantoja") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 4. Seguridad 2-jun (Jouannet -> Giannini; Quintana -> Guerrero): ${movHtml.includes("Jouannet") && movHtml.includes("Giannini") && movHtml.includes("Guerrero") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 5. Mujer 16-jun (Daniela Castro Araya -> Marcia Raphael Mora): ${movHtml.includes("Daniela Castro Araya") && movHtml.includes("Marcia Raphael Mora") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 6. Hacienda (Rodríguez -> Bunster -> Vallebona): ${movHtml.includes("Juan Pablo Rodríguez") && movHtml.includes("Bunster") && movHtml.includes("Vallebona") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 7. Deporte 14-ago (Duco -> Riveros; Otero -> Rengifo): ${movHtml.includes("Natalia Duco") && movHtml.includes("Riveros") && movHtml.includes("Andrés Otero") && movHtml.includes("Rengifo") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- 8. Atacama (Sebastián Urrejola / DPP Chañaral): ${movHtml.includes("Sebastián Urrejola") && movHtml.includes("Chañaral") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- CERO menciones de "Müller" (Gonzalo Müller): ${!movHtml.toLowerCase().includes("müller") && !movHtml.toLowerCase().includes("muller") ? "✅ SÍ (0 Müller)" : "❌ NO"}`);
  console.log(`- Cero typos 'Subrogente' (Normalizado a Subrogante): ${!movHtml.toLowerCase().includes("subrogente") ? "✅ SÍ" : "❌ NO"}`);

  // 2. /servicios-publicos
  const servRes = await fetch("https://cambiometro.impulsacv.cl/servicios-publicos");
  const servHtml = await servRes.text();
  console.log(`\n2. /servicios-publicos -> Status: ${servRes.status}`);
  console.log(`- SEGEGOB con Claudio Alvarado: ${servHtml.includes("Claudio Alvarado") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Deporte con Francisco Riveros: ${servHtml.includes("Francisco Riveros") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- MOP con Louis de Grange: ${servHtml.includes("Louis de Grange") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- CERO menciones de "Müller": ${!servHtml.toLowerCase().includes("müller") && !servHtml.toLowerCase().includes("muller") ? "✅ SÍ" : "❌ NO"}`);

  // 3. Invariante Kaiser (3 requests to avoid warm-instance stale cache)
  let kaiserHtml = "";
  let kaiserStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
    kaiserStatus = kaiserRes.status;
    const html = await kaiserRes.text();
    if (html.includes("8.291.039")) { kaiserHtml = html; break; }
    if (attempt === 2) kaiserHtml = html;
  }
  console.log(`\n3. Ficha Vanessa Kaiser -> Status: ${kaiserStatus}`);
  console.log(`- Contiene Dieta Oficial "$8.291.039": ${kaiserHtml.includes("8.291.039") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- CERO transposición antigua "$8.239.091": ${!kaiserHtml.includes("8.239.091") ? "✅ SÍ (0 8.239.091)" : "❌ NO"}`);
  console.log(`- Contiene "$4.582.550" / "$15.250.000": ${kaiserHtml.includes("4.582.550") || kaiserHtml.includes("15.250.000") ? "✅ SÍ" : "❌ NO"}`);
  console.log(`- Contiene "+33,7%": ${kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%") ? "✅ SÍ" : "❌ NO"}`);

  // 4. Invariante Maipú 301
  const muniRedirectRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
  console.log(`\n4. Redirección /municipalidades/muni-maipu -> Status: ${muniRedirectRes.status} (Location: ${muniRedirectRes.headers.get("location")})`);

  console.log("\n=== Verificación Finalizada ===");
}

verifyProd().catch(console.error);
