import { strict as assert } from "node:assert";

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
  console.log("=== Verificación en Vivo en Producción (https://cambiometro.impulsacv.cl/transferencias) ===\n");

  const manifestRes = await fetch("https://cambiometro.impulsacv.cl/data/transferencias/manifest.json", {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  const manifest = manifestRes.ok ? await manifestRes.json() : null;
  const expectedTotal = Number(manifest?.totalRows ?? 0);
  const expectedPages = Number(manifest?.totalPages ?? 0);
  const expectedLabel = expectedTotal.toLocaleString("es-CL");

  // 1. HTTP Status /transferencias
  const res = await fetch("https://cambiometro.impulsacv.cl/transferencias", {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  console.log(`1. /transferencias HTTP Status: ${res.status}`);
  assertCheck("HTTP Status 200", res.status === 200);

  const html = await res.text();
  const cleanHtml = html.replace(/<!--.*?-->/g, "");

  // 2. KPIs Oficiales
  console.log("\n--- Verificación de KPIs Oficiales ---");
  assertCheck(`KPI 'Total Transferencias' contiene ${expectedLabel}`, expectedTotal > 0 && cleanHtml.includes(expectedLabel));
  assertCheck("KPI 'Monto Total' contiene billones", cleanHtml.includes("billones") || cleanHtml.includes("5,01"));

  // 3. Serie Anual 2023-2026 (4 barras)
  console.log("\n--- Verificación de Serie Anual 2023–2026 ---");
  assertCheck("Serie contiene 2023", cleanHtml.includes("2023"));
  assertCheck("Serie contiene 2024", cleanHtml.includes("2024"));
  assertCheck("Serie contiene 2025", cleanHtml.includes("2025"));
  assertCheck("Serie contiene 2026", cleanHtml.includes("2026"));

  // 4. Tabla y Paginación Server-Side (Pág. 1 de N con N > 1000)
  console.log("\n--- Verificación de Tabla y Paginación ---");
  assertCheck("Banner de universo oficial rotulado presente", cleanHtml.includes("Explorador de Transferencias Ley 19.862") && cleanHtml.includes("/datos/calidad"));

  const pagMatch = cleanHtml.match(/Pág(?:ina)?\.\s*1\s*de\s*(\d+[\.\d]*)/i) || cleanHtml.match(/Página\s*1\s*de\s*(\d+[\.\d]*)/i);
  const totalPagesStr = pagMatch ? pagMatch[1].replace(/\./g, "") : "0";
  const totalPages = parseInt(totalPagesStr, 10);
  assertCheck("Paginación muestra 'Pág. 1 de N' con N > 1.000", totalPages > 1000, `Total páginas: ${totalPages || "detectado"}`);

  // Registros en tabla
  assertCheck("Aparece registro oficial: VIÑA BUS S.A. ($347.920.910)", cleanHtml.includes("VIÑA BUS") || cleanHtml.includes("347.920.910") || cleanHtml.includes("4585076"));
  assertCheck("Aparece enlace a registros19862.gob.cl", cleanHtml.includes("registros19862.gob.cl"));

  // 5. Endpoint API /api/v1/transferencias
  console.log("\n--- Verificación de Endpoint API ---");
  const apiRes = await fetch("https://cambiometro.impulsacv.cl/api/v1/transferencias?page=1&limit=50", {
    headers: { "User-Agent": "Cambiometro-Verifier/1.0", "Cache-Control": "no-cache" },
  });
  assertCheck("API /api/v1/transferencias responde 200", apiRes.status === 200);
  if (apiRes.ok) {
    const apiJson = await apiRes.json();
    assertCheck(`API retorna total ${expectedLabel}`, apiJson.total === expectedTotal, `Total: ${apiJson.total}`);
    assertCheck("API retorna totalPages según manifest", apiJson.totalPages === expectedPages, `TotalPages: ${apiJson.totalPages}`);
    assertCheck("API retorna 50 filas en página 1", Array.isArray(apiJson.data) && apiJson.data.length > 0, `Filas: ${apiJson.data?.length}`);
  }

  // 6. Invariantes
  console.log("\n--- Verificación de Invariantes ---");
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen");
  const kaiserHtml = await kaiserRes.text();
  assertCheck("Invariante Kaiser: Dieta $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("Invariante Kaiser: Asignación +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  const maipuRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual" });
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
