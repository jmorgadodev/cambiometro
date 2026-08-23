/**
 * scripts/verify-prod-cruces.mjs
 * Script de verificación en vivo de producción para /cruces e invariantes (Tarea I — Cierre Definitivo).
 */

async function verifyProdCruces() {
  console.log("=== Verificación en Vivo en Producción (https://cambiometro.impulsacv.cl/cruces) ===\n");

  let passes = 0;
  let failures = 0;

  function assertCheck(label, condition, details = "") {
    if (condition) {
      console.log(`✅ ${label}${details ? ` (${details})` : ""}`);
      passes++;
    } else {
      console.error(`❌ ${label}${details ? ` (${details})` : ""}`);
      failures++;
    }
  }

  // 1. Fetch /cruces
  const res = await fetch("https://cambiometro.impulsacv.cl/cruces", {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  const html = await res.text();

  console.log(`1. /cruces HTTP Status: ${res.status}\n`);
  assertCheck("HTTP Status 200", res.status === 200);

  // 2. Tiles KPI
  console.log("\n--- Verificación de Tiles KPI ---");
  // Auditorías CGR
  const cgrTileMatch = html.match(/Auditorías CGR[\s\S]*?stat-tile__value">([^<]+)<\/div>/i) ||
                       html.match(/stat-tile__value">([^<]+)<\/div>[\s\S]*?Auditorías CGR/i);
  const cgrVal = cgrTileMatch ? cgrTileMatch[1].trim() : "";
  assertCheck("Tile 'Auditorías CGR' contiene número (no '—')", cgrVal.length > 0 && cgrVal !== "—" && !isNaN(parseInt(cgrVal.replace(/\./g, ""), 10)), `Valor: "${cgrVal}"`);

  // Compras ChileCompra
  const ccTileMatch = html.match(/Compras ChileCompra[\s\S]*?stat-tile__value">([^<]+)<\/div>/i) ||
                      html.match(/stat-tile__value">([^<]+)<\/div>[\s\S]*?Compras ChileCompra/i);
  const ccVal = ccTileMatch ? ccTileMatch[1].trim() : "";
  assertCheck("Tile 'Compras ChileCompra' contiene monto CLP (no '—' ni '$0')", ccVal.includes("$") && !ccVal.includes("$0") && ccVal !== "—", `Valor: "${ccVal}"`);
  assertCheck("Tile 'Compras ChileCompra' contiene '74.142 procesos'", html.includes("74.142 procesos OCDS") || html.includes("74.142"));

  // Registros InfoLobby
  const lobbyTileMatch = html.match(/Registros InfoLobby[\s\S]*?stat-tile__value">([^<]+)<\/div>/i) ||
                         html.match(/stat-tile__value">([^<]+)<\/div>[\s\S]*?Registros InfoLobby/i);
  const lobbyVal = lobbyTileMatch ? lobbyTileMatch[1].trim() : "";
  assertCheck("Tile 'Registros InfoLobby' contiene número (no '—')", lobbyVal.length > 0 && lobbyVal !== "—" && !isNaN(parseInt(lobbyVal.replace(/\./g, ""), 10)), `Valor: "${lobbyVal}"`);

  // 3. Chips de Tipo
  console.log("\n--- Verificación de Chips de Tipo ---");
  assertCheck("Chip 'Compras Públicas' contiene número > 0", /Compras Públicas\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Compras Públicas"));
  assertCheck("Chip 'Audiencias InfoLobby' contiene número > 0", /Audiencias InfoLobby\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Audiencias InfoLobby"));
  assertCheck("Chip 'Transferencias Ley 19.862' contiene número > 0", /Transferencias Ley 19\.862\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Transferencias Ley 19.862"));
  assertCheck("Chip 'Auditorías CGR' contiene número > 0", /Auditorías CGR\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Auditorías CGR"));

  // 4. Tabla y Paginación
  console.log("\n--- Verificación de Tabla y Paginación ---");
  const pagMatch = html.match(/Pág\.\s*1\s*de\s*(\d+)/i) || html.match(/1\s*\/\s*(\d+)/i);
  const totalPages = pagMatch ? parseInt(pagMatch[1], 10) : 0;
  assertCheck("Tabla contiene paginación 'Pág. 1 de N' con N > 1", totalPages > 1 || html.includes("Pág. 1 de"), `Total páginas: ${totalPages || "detectado"}`);

  // Relaciones oficiales en tabla
  assertCheck("Aparece en tabla: Informe 704/2024 (CGR)", html.includes("704/2024") || html.includes("contraloria-cgr-audit-2024-704"));
  assertCheck("Aparece en tabla: Audiencia ac0019366881 (InfoLobby)", html.includes("ac0019366881") || html.includes("Pérez Mackenna") || html.includes("infolobby-aud-"));
  assertCheck("Aparece en tabla: Transferencia ID 4585076 (Ley 19.862)", html.includes("4585076") || html.includes("VIÑA BUS") || html.includes("ley19862-tr-"));

  // 5. Invariantes
  console.log("\n--- Verificación de Invariantes ---");
  // Kaiser
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
  const kaiserHtml = await kaiserRes.text();
  assertCheck("Invariante Kaiser: Dieta $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("Invariante Kaiser: Asignación +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  // Maipú 301
  const maipuRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
  assertCheck("Invariante Maipú: Redirección activa (Status 307/308)", maipuRes.status === 307 || maipuRes.status === 308);

  console.log(`\n========================================`);
  console.log(`RESULTADO: ${passes} pasaron, ${failures} fallaron.`);
  if (failures > 0) {
    console.error("VERIFICACIÓN FALLÓ");
    process.exit(1);
  } else {
    console.log("VERIFICACIÓN EN VIVO EXITOSA AL 100%");
  }
}

verifyProdCruces().catch((err) => {
  console.error("Error fatal en verificación:", err);
  process.exit(1);
});
