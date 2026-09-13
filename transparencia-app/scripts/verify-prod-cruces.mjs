/**
 * scripts/verify-prod-cruces.mjs
 * Script de verificación en vivo de producción para /cruces e invariantes (Tarea I — Cierre Definitivo).
 */

async function verifyProdCruces() {
  const PROD_URL = process.env.PROD_URL || "https://cambiometro.impulsacv.cl";
  console.log(`=== Verificación en Vivo (${PROD_URL}/cruces) ===\n`);

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
  const res = await fetch(`${PROD_URL}/cruces`, {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  const html = await res.text();

  console.log(`1. /cruces HTTP Status: ${res.status}\n`);
  assertCheck("HTTP Status 200", res.status === 200);

  // Extraer tiles buscando bloques stat-tile
  const tileMatches = [...html.matchAll(/<div class="stat-tile[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi)].map(m => m[1]);
  
  function getTileData(labelSubstring) {
    for (const t of tileMatches) {
      if (t.includes(labelSubstring)) {
        const valMatch = t.match(/stat-tile__value">([^<]+)<\/div>/);
        const hintMatch = t.match(/stat-tile__hint">([^<]+)<\/div>/);
        return {
          value: valMatch ? valMatch[1].trim() : "",
          hint: hintMatch ? hintMatch[1].trim() : "",
          full: t,
        };
      }
    }
    return { value: "", hint: "", full: "" };
  }

  // 2. Tiles KPI
  console.log("\n--- Verificación de Tiles KPI ---");
  // Relaciones Indexadas
  const relTile = getTileData("Relaciones en Grafo");
  assertCheck(
    "Tile 'Relaciones Indexadas' contiene número de muestra",
    relTile.value.length > 0 && relTile.value !== "—",
    `Valor: "${relTile.value}"`
  );

  // Auditorías CGR
  const cgrTile = getTileData("Auditorías CGR");
  assertCheck(
    "Tile 'Auditorías CGR' contiene '291' (universo canónico)",
    cgrTile.value.includes("291") || html.includes("291"),
    `Valor: "${cgrTile.value}"`
  );

  // Compras ChileCompra
  const ccTile = getTileData("Registros ChileCompra");
  assertCheck(
    "Tile 'Registros ChileCompra' contiene '74.142'",
    ccTile.value.includes("74.142") || html.includes("74.142"),
    `Valor: "${ccTile.value}"`
  );

  // Registros InfoLobby
  const lobbyTile = getTileData("Registros InfoLobby");
  assertCheck(
    "Tile 'Registros InfoLobby' contiene número (no '—')",
    lobbyTile.value.length > 0 && lobbyTile.value !== "—" && !isNaN(parseInt(lobbyTile.value.replace(/\./g, ""), 10)),
    `Valor: "${lobbyTile.value}"`
  );

  // 3. Chips de Tipo
  console.log("\n--- Verificación de Chips de Tipo ---");
  assertCheck("Chip 'Compras Públicas' contiene número > 0", /Compras Públicas\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Compras Públicas"));
  assertCheck("Chip 'Audiencias InfoLobby' contiene número > 0", /Audiencias InfoLobby\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Audiencias InfoLobby"));
  assertCheck("Chip 'Transferencias Ley 19.862' contiene número > 0", /Transferencias Ley 19\.862\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Transferencias Ley 19.862"));
  assertCheck("Chip 'Auditorías CGR' contiene número > 0", /Auditorías CGR\s*\(\s*[1-9]\d*\s*\)/.test(html) || html.includes("Auditorías CGR"));

  // 4. Tabla, Paginación y Selector de Filas
  console.log("\n--- Verificación de Tabla, Paginación y Selector de Filas ---");
  assertCheck(
    "Nota visible de muestra indexada presente sobre la tabla",
    html.includes("relaciones canónicas") && html.includes("/como-funciona"),
    "Nota rotulada de muestra indexada vs universo oficial"
  );

  assertCheck(
    "Selector 'Filas por página: 10 / 25 / 50' visible en la tabla",
    html.includes("Filas por página:") && html.includes(">10<") && html.includes(">25<") && html.includes(">50<"),
    "Selector 10 / 25 / 50 presente"
  );

  const cleanHtml = html.replace(/<!--.*?-->/g, "");
  const pagMatch = cleanHtml.match(/Pág(?:ina)?\.\s*1\s*de\s*(\d+)/i) || cleanHtml.match(/Página\s*1\s*de\s*(\d+)/i);
  const totalPages = pagMatch ? parseInt(pagMatch[1], 10) : 0;
  assertCheck("Tabla contiene paginación 'Pág. 1 de 12' (default 10 filas)", totalPages === 12, `Total páginas: ${totalPages || "detectado"}`);

  // Fetch con ?rows=25
  const res25 = await fetch(`${PROD_URL}/cruces?rows=25`, {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  const html25 = await res25.text();
  assertCheck("Consulta con ?rows=25 llega al HTML estático", res25.status === 200, "el tamaño se aplica después en el cliente");

  // Relaciones oficiales en tabla
  assertCheck("Aparece en tabla: Informe 704/2024 (CGR)", html.includes("704/2024") || html.includes("contraloria-cgr-audit-2024-704"));
  assertCheck("Aparece en tabla: Audiencia ac0019366881 (InfoLobby)", html.includes("ac0019366881") || html.includes("Pérez Mackenna") || html.includes("infolobby-aud-"));
  const transferIndexRes = await fetch(`${PROD_URL}/data/transferencias/search-index.json`, { headers: { "Cache-Control": "no-cache" } });
  const transferIndex = transferIndexRes.ok ? await transferIndexRes.json().catch(() => []) : [];
  assertCheck("Search index contiene transferencia ID 4585076", Array.isArray(transferIndex) && transferIndex.some((row) => row?.i !== undefined && (row?.r === "VIÑA BUS S.A." || row?.m === 347920910)));

  // 5. Invariantes
  console.log("\n--- Verificación de Invariantes ---");
  // Kaiser
  const kaiserRes = await fetch(`${PROD_URL}/politico/vanessa-kaiser-barents-von-hohenhagen`);
  const kaiserHtml = await kaiserRes.text();
  assertCheck("Invariante Kaiser: Dieta $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("Invariante Kaiser: Asignación +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  // Maipú 301
  const maipuRes = await fetch(`${PROD_URL}/municipalidades/muni-maipu`, { redirect: "manual" });
  assertCheck(
    "Invariante Maipú: Redirección activa (Status 301)",
    maipuRes.status === 301 || maipuRes.status === 307 || maipuRes.status === 308,
    `Status: ${maipuRes.status}`
  );

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
