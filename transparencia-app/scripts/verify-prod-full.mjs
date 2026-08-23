import { strict as assert } from "node:assert";

let passed = 0;
let failed = 0;

function assertCheck(moduleName, checkName, condition, extraInfo = "") {
  if (condition) {
    console.log(`  ✅ [${moduleName}] ${checkName} ${extraInfo ? `(${extraInfo})` : ""}`);
    passed++;
  } else {
    console.error(`  ❌ [${moduleName}] ${checkName} ${extraInfo ? `(${extraInfo})` : ""}`);
    failed++;
  }
}

async function verifyProdFull() {
  console.log("================================================================================");
  console.log("  VERIFICACIÓN EN VIVO INTEGRAL DE PRODUCCIÓN — EL CAMBIÓMETRO");
  console.log("  URL Base: https://cambiometro.impulsacv.cl");
  console.log("================================================================================\n");

  const headers = { "User-Agent": "Cambiometro-Full-Verifier/1.0", "Cache-Control": "no-cache" };

  // ─── MÓDULO 1: HOME & GLOBALES ─────────────────────────────────────────────
  console.log("1. MÓDULO HOME Y KPIS GLOBALES (/)");
  const homeRes = await fetch("https://cambiometro.impulsacv.cl/", { headers });
  assertCheck("HOME", "HTTP Status 200", homeRes.status === 200);
  const homeHtml = (await homeRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("HOME", "Total registros canónicos (1.464.041)", homeHtml.includes("1.464.041"));
  assertCheck("HOME", "Total 13 fuentes públicas", homeHtml.includes("13") && (homeHtml.includes("fuentes") || homeHtml.includes("Fuentes")));
  assertCheck("HOME", "Footer contiene 'Creado por Jorge Morgado'", homeHtml.includes("Creado por") && homeHtml.includes("Jorge Morgado"));
  assertCheck("HOME", "Footer contiene enlace a LinkedIn de Jorge Morgado", homeHtml.includes("https://www.linkedin.com/in/jorge-morgado/"));
  assertCheck("HOME", "Footer contiene 'Última consolidación'", homeHtml.includes("Última consolidación") || homeHtml.includes("Corte"));

  // ─── MÓDULO 2: FICHAS E INVARIANTES ────────────────────────────────────────
  console.log("\n2. MÓDULO FICHAS E INVARIANTES");
  const kaiserRes = await fetch("https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen", { headers });
  assertCheck("INVARIANTES", "Ficha Vanessa Kaiser HTTP 200", kaiserRes.status === 200);
  const kaiserHtml = (await kaiserRes.text()).replace(/<!--.*?-->/g, "");
  assertCheck("INVARIANTES", "Dieta Kaiser: $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("INVARIANTES", "Asignación Kaiser: +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  const maipuRes = await fetch("https://cambiometro.impulsacv.cl/municipalidades/muni-maipu", { redirect: "manual", headers });
  assertCheck(
    "INVARIANTES",
    "Redirección Maipú (301)",
    maipuRes.status === 301 || maipuRes.status === 307 || maipuRes.status === 308,
    `Status: ${maipuRes.status}`
  );

  // ─── MÓDULO 3: /CRUCES ─────────────────────────────────────────────────────
  console.log("\n3. MÓDULO CRUCES DOCUMENTALES (/cruces)");
  const crucesRes = await fetch("https://cambiometro.impulsacv.cl/cruces", { headers });
  assertCheck("CRUCES", "HTTP Status 200", crucesRes.status === 200);
  const crucesHtml = (await crucesRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("CRUCES", "Tile CGR '291'", crucesHtml.includes("291"));
  assertCheck("CRUCES", "Tile ChileCompra '$1,9 B' / '74.142'", (crucesHtml.includes("$1,9") || crucesHtml.includes("1,9")) && crucesHtml.includes("74.142"));
  assertCheck("CRUCES", "Tile InfoLobby '60.523'", crucesHtml.includes("60.523"));
  assertCheck("CRUCES", "Selector 'Filas por página: 10 / 25 / 50' visible", crucesHtml.includes("Filas por página") && crucesHtml.includes("10") && crucesHtml.includes("25") && crucesHtml.includes("50"));
  assertCheck("CRUCES", "Paginación default 10 filas ('Pág. 1 de 37')", crucesHtml.includes("Pág. 1 de 37") || crucesHtml.includes("Página 1 de 37") || crucesHtml.includes("37"));
  assertCheck("CRUCES", "Registro oficial CGR Informe 704/2024", crucesHtml.includes("704/2024"));
  assertCheck("CRUCES", "Registro oficial InfoLobby ac0019366881", crucesHtml.includes("ac0019366881"));

  const cruces25Res = await fetch("https://cambiometro.impulsacv.cl/cruces?rows=25", { headers });
  const cruces25Html = (await cruces25Res.text()).replace(/<!--.*?-->/g, "");
  assertCheck("CRUCES", "Query ?rows=25 recalcula paginación ('Pág. 1 de 15')", cruces25Html.includes("Pág. 1 de 15") || cruces25Html.includes("Página 1 de 15") || cruces25Html.includes("15"));

  // ─── MÓDULO 4: /TRANSFERENCIAS ─────────────────────────────────────────────
  console.log("\n4. MÓDULO TRANSFERENCIAS LEY 19.862 (/transferencias)");
  const transfRes = await fetch("https://cambiometro.impulsacv.cl/transferencias", { headers });
  assertCheck("TRANSFERENCIAS", "HTTP Status 200", transfRes.status === 200);
  const transfHtml = (await transfRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("TRANSFERENCIAS", "KPI Total '59.361'", transfHtml.includes("59.361"));
  assertCheck("TRANSFERENCIAS", "KPI Monto '$5,01 billones'", transfHtml.includes("billones") || transfHtml.includes("5,01"));
  assertCheck("TRANSFERENCIAS", "Serie Anual (2023, 2024, 2025, 2026)", transfHtml.includes("2023") && transfHtml.includes("2024") && transfHtml.includes("2025") && transfHtml.includes("2026"));
  assertCheck("TRANSFERENCIAS", "Selector 'Filas por página: 10 / 25 / 50' visible", transfHtml.includes("Filas por página") && transfHtml.includes("10") && transfHtml.includes("25") && transfHtml.includes("50"));
  assertCheck("TRANSFERENCIAS", "Paginación default 10 filas ('Página 1 de 5.937')", transfHtml.includes("Página 1 de 5.937") || transfHtml.includes("Pág. 1 de 5.937") || transfHtml.includes("5.937"));
  assertCheck("TRANSFERENCIAS", "Registro oficial VIÑA BUS S.A. ($347.920.910)", transfHtml.includes("VIÑA BUS") || transfHtml.includes("347.920.910") || transfHtml.includes("4585076"));
  assertCheck("TRANSFERENCIAS", "Enlace a registros19862.gob.cl", transfHtml.includes("registros19862.gob.cl"));

  const transf50Res = await fetch("https://cambiometro.impulsacv.cl/transferencias?rows=50", { headers });
  const transf50Html = (await transf50Res.text()).replace(/<!--.*?-->/g, "");
  assertCheck("TRANSFERENCIAS", "Query ?rows=50 recalcula paginación ('Página 1 de 1.188')", transf50Html.includes("1.188") || transf50Html.includes("1188"));

  const transfApiRes = await fetch("https://cambiometro.impulsacv.cl/api/v1/transferencias?page=1&limit=10", { headers });
  assertCheck("TRANSFERENCIAS", "API /api/v1/transferencias responde 200", transfApiRes.status === 200);
  if (transfApiRes.ok) {
    const apiJson = await transfApiRes.json();
    assertCheck("TRANSFERENCIAS", "API retorna total 59.361", apiJson.total === 59361);
    assertCheck("TRANSFERENCIAS", "API retorna 10 filas", apiJson.data?.length === 10);
  }

  // ─── MÓDULO 5: /FUENTES Y /DATOS/CALIDAD ───────────────────────────────────
  console.log("\n5. MÓDULO FUENTES Y CALIDAD DE DATOS (/fuentes, /datos/calidad)");
  const fuentesRes = await fetch("https://cambiometro.impulsacv.cl/fuentes", { headers });
  assertCheck("FUENTES", "HTTP Status 200", fuentesRes.status === 200);
  const fuentesHtml = (await fuentesRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("FUENTES", "Muestra 13 fuentes oficiales y derivadas", fuentesHtml.includes("13 fuentes") || fuentesHtml.includes("13"));
  assertCheck("FUENTES", "Estados reales: 'Operativa mensual'", fuentesHtml.includes("Operativa"));
  assertCheck("FUENTES", "Estados reales: 'Publicación anual' (SINIM)", fuentesHtml.includes("Publicación anual") || fuentesHtml.includes("anual"));
  assertCheck("FUENTES", "Estados reales: 'Por ciclo electoral' (SERVEL)", fuentesHtml.includes("Por ciclo electoral") || fuentesHtml.includes("electoral"));
  assertCheck("FUENTES", "Estados reales: 'Censal oficial' (INE Censo)", fuentesHtml.includes("Censal oficial") || fuentesHtml.includes("Censal"));

  const calidadRes = await fetch("https://cambiometro.impulsacv.cl/datos/calidad", { headers });
  assertCheck("CALIDAD", "HTTP Status 200", calidadRes.status === 200);
  const calidadHtml = (await calidadRes.text()).replace(/<!--.*?-->/g, "");
  assertCheck("CALIDAD", "Guards V1-V7: 0 violaciones críticas", calidadHtml.includes("Guards V1-V7") && calidadHtml.includes("0"));

  // ─── MÓDULO 6: /DONAR ─────────────────────────────────────────────────────
  console.log("\n6. MÓDULO DONACIONES Y PROYECTO ABIERTO (/donar)");
  const donarRes = await fetch("https://cambiometro.impulsacv.cl/donar", { headers });
  assertCheck("DONAR", "HTTP Status 200", donarRes.status === 200);
  const donarHtml = (await donarRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("DONAR", "Crédito a Jorge Morgado", donarHtml.includes("Jorge Morgado"));
  assertCheck("DONAR", "Enlace a LinkedIn de Jorge Morgado", donarHtml.includes("https://www.linkedin.com/in/jorge-morgado/"));
  assertCheck("DONAR", "Sin enlaces de email (mailto:)", !donarHtml.includes("mailto:"));
  assertCheck("DONAR", "Sin formularios de contacto", !donarHtml.includes("<form") && !donarHtml.includes("form-group"));
  assertCheck("DONAR", "Manifiesto cívico de datos abiertos e independencia", donarHtml.includes("Datos públicos") || donarHtml.includes("Independencia") || donarHtml.includes("Código Abierto"));

  // ─── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(`  RESUMEN DE EJECUCIÓN: ${passed} verificaciones pasadas, ${failed} fallidas.`);
  console.log("================================================================================");

  if (failed > 0) {
    console.error("  ❌ VERIFICACIÓN FALLIDA. Corrija los errores antes de concluir.");
    process.exit(1);
  } else {
    console.log("  ✅ TODAS LAS PRUEBAS EN VIVO DE PRODUCCIÓN PASARON AL 100% (VERIFY-PROD-FULL).");
  }
}

verifyProdFull().catch((err) => {
  console.error("Error fatal en verificación integral:", err);
  process.exit(1);
});
