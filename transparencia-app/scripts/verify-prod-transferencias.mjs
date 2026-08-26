let passed = 0;
let failed = 0;

function assertCheck(name, condition, extraInfo = "") {
  if (condition) {
    console.log(`✅ ${name} ${extraInfo ? `(${extraInfo})` : ""}`);
    passed++;
  } else {
    console.error(`❌ ${name} ${extraInfo ? `(${extraInfo})` : ""}`);
    failed++;
  }
}

async function verifyProdTransferencias() {
  const PROD_URL = process.env.PROD_URL || "https://cambiometro.impulsacv.cl";
  const API_URL = process.env.API_URL || PROD_URL;
  console.log(`=== Verificación en Vivo (${PROD_URL}/transferencias) ===\n`);

  const manifestRes = await fetch(`${PROD_URL}/data/transferencias/manifest.json`, { headers: { "Cache-Control": "no-cache" } });
  const manifest = manifestRes.ok ? await manifestRes.json().catch(() => null) : null;
  const expectedRows = Number(manifest?.totalRows ?? 0);
  const expectedPages = Number(manifest?.totalPages ?? 0);

  // 1. HTTP Status /transferencias
  const res = await fetch(`${PROD_URL}/transferencias`, {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  console.log(`1. /transferencias HTTP Status: ${res.status}`);
  assertCheck("HTTP Status 200", res.status === 200);

  const html = await res.text();
  const cleanHtml = html.replace(/<!--.*?-->/g, "");

  // 2. KPIs Oficiales
  console.log("\n--- Verificación de KPIs Oficiales ---");
  assertCheck("Manifest de transferencias responde 200", manifestRes.status === 200);
  assertCheck("KPI 'Total Transferencias' coincide con manifest", expectedRows > 1000 && cleanHtml.includes(expectedRows.toLocaleString("es-CL")), `Total: ${expectedRows.toLocaleString("es-CL")}`);
  assertCheck("KPI 'Monto Total' contiene billones", cleanHtml.includes("billones") || cleanHtml.includes("5,01"));

  // 3. Serie Anual: se comprueba contra los años declarados por el release.
  console.log("\n--- Verificación de Serie Anual ---");
  const summaryRes = await fetch(`${PROD_URL}/data/transferencias/summary.json`, { headers: { "Cache-Control": "no-cache" } });
  const summary = summaryRes.ok ? await summaryRes.json().catch(() => null) : null;
  const summaryYears = Object.keys(summary?.by_year ?? {});
  assertCheck("Summary de transferencias responde 200", summaryRes.status === 200);
  assertCheck("Serie contiene todos los años del release", summaryYears.length > 0 && summaryYears.every((year) => cleanHtml.includes(year)), summaryYears.join(", "));

  // 4. Tabla y Paginación Server-Side (Pág. 1 de N con N > 1000)
  console.log("\n--- Verificación de Tabla y Paginación ---");
  assertCheck("Banner de universo oficial rotulado presente", cleanHtml.includes("Explorador de Transferencias Ley 19.862") && cleanHtml.includes("/datos/calidad"));

  const pagMatch = cleanHtml.match(/Pág(?:ina)?\.\s*1\s*de\s*(\d+[\.\d]*)/i) || cleanHtml.match(/Página\s*1\s*de\s*(\d+[\.\d]*)/i);
  const totalPagesStr = pagMatch ? pagMatch[1].replace(/\./g, "") : "0";
  const totalPages = parseInt(totalPagesStr, 10);
  assertCheck("Paginación coincide con manifest", totalPages === Math.ceil(expectedRows / 10), `Total páginas: ${totalPages || "detectado"}`);

  // Registros en tabla
  assertCheck("Aparece registro oficial: VIÑA BUS S.A. ($347.920.910)", cleanHtml.includes("VIÑA BUS") || cleanHtml.includes("347.920.910") || cleanHtml.includes("4585076"));
  assertCheck("Aparece enlace a registros19862.gob.cl", cleanHtml.includes("registros19862.gob.cl"));

  // 5. Endpoint API /api/v1/transferencias
  console.log("\n--- Verificación de Endpoint API ---");
  const apiRes = await fetch(`${API_URL}/api/v1/transferencias?page=1&limit=10`, {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  assertCheck("API /api/v1/transferencias responde 200", apiRes.status === 200);
  if (apiRes.ok) {
    const apiJson = await apiRes.json();
    assertCheck("API retorna total igual al manifest", apiJson.total === expectedRows, `Total: ${apiJson.total}`);
    assertCheck("API retorna totalPages igual al manifest lógico", apiJson.totalPages === Math.ceil(expectedRows / 10), `TotalPages: ${apiJson.totalPages}`);
    assertCheck("API retorna filas en página 1", Array.isArray(apiJson.data) && apiJson.data.length > 0, `Filas: ${apiJson.data?.length}`);
  }

  // 6. Invariantes
  console.log("\n--- Verificación de Invariantes ---");
  const kaiserRes = await fetch(`${PROD_URL}/politico/vanessa-kaiser-barents-von-hohenhagen`);
  const kaiserHtml = await kaiserRes.text();
  assertCheck("Invariante Kaiser: Dieta $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("Invariante Kaiser: Asignación +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  const maipuRes = await fetch(`${PROD_URL}/municipalidades/muni-maipu`, { redirect: "manual" });
  assertCheck(
    "Invariante Maipú: Redirección activa (Status 301)",
    maipuRes.status === 301 || maipuRes.status === 307 || maipuRes.status === 308,
    `Status: ${maipuRes.status}`
  );

  console.log("\n========================================");
  console.log(`RESULTADO: ${passed} pasaron, ${failed} fallaron.`);
  if (failed > 0) {
    console.error("VERIFICACIÓN FALLÓ");
    process.exit(1);
  } else {
    console.log("VERIFICACIÓN EN VIVO EXITOSA AL 100%");
  }
}

verifyProdTransferencias().catch((err) => {
  console.error("Error fatal en verificación:", err);
  process.exit(1);
});
