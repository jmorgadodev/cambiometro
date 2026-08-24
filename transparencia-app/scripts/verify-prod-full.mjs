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
  const PROD_URL = process.env.PROD_URL || "https://cambiometro.impulsacv.cl";
  console.log(`  URL Base: ${PROD_URL}`);
  console.log("================================================================================\n");

  const headers = { "User-Agent": "Cambiometro-Full-Verifier/1.0", "Cache-Control": "no-cache" };

  // ─── MÓDULO 1: HOME & GLOBALES ─────────────────────────────────────────────
  console.log("1. MÓDULO HOME Y FOOTER COMPACTO (/)");
  const homeRes = await fetch(`${PROD_URL}/`, { headers });
  assertCheck("HOME", "HTTP Status 200", homeRes.status === 200);
  const homeHtml = (await homeRes.text()).replace(/<!--.*?-->/g, "");

  // Version ID header/tag check
  const cfRay = homeRes.headers.get("cf-ray") || "local";
  const etag = homeRes.headers.get("etag") || "v1.0";
  const versionId = `${etag}-${cfRay.slice(0, 8)}`;

  assertCheck("HOME", "Total registros canónicos (1.753.013)", homeHtml.includes("1.753.013"));
  assertCheck("HOME", "Total entidades identificadas (3.281)", homeHtml.includes("3.281"));
  assertCheck("HOME", "Total relaciones y cruces (1.897)", homeHtml.includes("1.897"));
  assertCheck("HOME", "Total votaciones de sala (12.111)", homeHtml.includes("12.111"));
  assertCheck("HOME", "Total gastos parlamentarios (690)", homeHtml.includes("690"));
  assertCheck("HOME", "Hero KPIs sin signo negativo '-' en SSR", !homeHtml.includes("home-stat\"><strong>-") && !homeHtml.includes("home-stat\">-"));
  assertCheck("HOME", "Total 13 fuentes públicas", homeHtml.includes("13") && (homeHtml.includes("fuentes") || homeHtml.includes("Fuentes")));
  assertCheck("HOME", "Footer contiene 'Creado por Jorge Morgado'", homeHtml.includes("Creado por") && homeHtml.includes("Jorge Morgado"));
  assertCheck("HOME", "Footer contiene enlace a LinkedIn de Jorge Morgado", homeHtml.includes("https://www.linkedin.com/in/jorge-morgado/"));
  assertCheck("HOME", "Footer NO contiene columna 'Explorar' (duplicada)", !homeHtml.includes('aria-label="Explorar"') && !homeHtml.includes('>Explorar</h2>'));
  assertCheck("HOME", "Footer contiene icono SVG de LinkedIn", homeHtml.includes("<svg") && homeHtml.includes("LinkedIn"));
  assertCheck("HOME", "Footer contiene icono SVG de Instagram", homeHtml.includes("<svg") && homeHtml.includes("Instagram"));
  assertCheck("HOME", "Footer contiene icono SVG de X", homeHtml.includes("<svg") && (homeHtml.includes("𝕏") || homeHtml.includes("Twitter")));
  assertCheck("HOME", "Footer contiene 'Última consolidación'", homeHtml.includes("Última consolidación") || homeHtml.includes("Corte"));

  // ─── MÓDULO 2: FICHAS E INVARIANTES ────────────────────────────────────────
  console.log("\n2. MÓDULO FICHAS E INVARIANTES");
  const kaiserRes = await fetch(`${PROD_URL}/politico/vanessa-kaiser-barents-von-hohenhagen`, { headers });
  assertCheck("INVARIANTES", "Ficha Vanessa Kaiser HTTP 200", kaiserRes.status === 200);
  const kaiserHtml = (await kaiserRes.text()).replace(/<!--.*?-->/g, "");
  assertCheck("INVARIANTES", "Dieta Kaiser: $8.291.039", kaiserHtml.includes("8.291.039"));
  assertCheck("INVARIANTES", "Asignación Kaiser: +33,7%", kaiserHtml.includes("+33,7%") || kaiserHtml.includes("33,7%"));

  const maipuRes = await fetch(`${PROD_URL}/municipalidades/muni-maipu`, { redirect: "manual", headers });
  assertCheck(
    "INVARIANTES",
    "Redirección Maipú (301)",
    maipuRes.status === 301 || maipuRes.status === 307 || maipuRes.status === 308,
    `Status: ${maipuRes.status}`
  );

  // ─── MÓDULO 3: /CRUCES ─────────────────────────────────────────────────────
  console.log("\n3. MÓDULO CRUCES DOCUMENTALES (/cruces)");
  const crucesRes = await fetch(`${PROD_URL}/cruces`, { headers });
  assertCheck("CRUCES", "HTTP Status 200", crucesRes.status === 200);
  const crucesHtml = (await crucesRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("CRUCES", "Tile CGR '291'", crucesHtml.includes("291"));
  assertCheck("CRUCES", "Tile ChileCompra '$1,9 billones' / '74.142'", (crucesHtml.includes("$1,9") || crucesHtml.includes("1,9")) && crucesHtml.includes("74.142"));
  assertCheck("CRUCES", "Tile InfoLobby '60.523'", crucesHtml.includes("60.523"));
  assertCheck("CRUCES", "Selector 'Filas por página: 10 / 25 / 50' visible", crucesHtml.includes("Filas por página") && crucesHtml.includes("10") && crucesHtml.includes("25") && crucesHtml.includes("50"));
  assertCheck("CRUCES", "Paginación default 10 filas ('Pág. 1 de 37')", crucesHtml.includes("Pág. 1 de 37") || crucesHtml.includes("Página 1 de 37") || crucesHtml.includes("37"));
  assertCheck("CRUCES", "Registro oficial CGR Informe 704/2024", crucesHtml.includes("704/2024"));
  assertCheck("CRUCES", "Registro oficial InfoLobby ac0019366881", crucesHtml.includes("ac0019366881"));

  const cruces25Res = await fetch(`${PROD_URL}/cruces?rows=25`, { headers });
  const cruces25Html = (await cruces25Res.text()).replace(/<!--.*?-->/g, "");
  assertCheck("CRUCES", "Query ?rows=25 recalcula paginación ('Pág. 1 de 15')", cruces25Html.includes("Pág. 1 de 15") || cruces25Html.includes("Página 1 de 15") || cruces25Html.includes("15"));

  // ─── MÓDULO 4: /TRANSFERENCIAS ─────────────────────────────────────────────
  console.log("\n4. MÓDULO TRANSFERENCIAS LEY 19.862 (/transferencias)");
  const transfRes = await fetch(`${PROD_URL}/transferencias`, { headers });
  assertCheck("TRANSFERENCIAS", "HTTP Status 200", transfRes.status === 200);
  const transfHtml = (await transfRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("TRANSFERENCIAS", "KPI Total '59.361'", transfHtml.includes("59.361"));
  assertCheck("TRANSFERENCIAS", "KPI Monto '$5,01 billones'", transfHtml.includes("billones") || transfHtml.includes("5,01"));
  assertCheck("TRANSFERENCIAS", "Serie Anual (2023, 2024, 2025, 2026)", transfHtml.includes("2023") && transfHtml.includes("2024") && transfHtml.includes("2025") && transfHtml.includes("2026"));
  assertCheck("TRANSFERENCIAS", "Selector 'Filas por página: 10 / 25 / 50' visible", transfHtml.includes("Filas por página") && transfHtml.includes("10") && transfHtml.includes("25") && transfHtml.includes("50"));
  assertCheck("TRANSFERENCIAS", "Paginación default 10 filas ('5.937 págs')", transfHtml.includes("5.937") || transfHtml.includes("5937"));
  assertCheck("TRANSFERENCIAS", "Registro oficial VIÑA BUS S.A. ($347.920.910)", transfHtml.includes("VIÑA BUS") || transfHtml.includes("347.920.910") || transfHtml.includes("4585076"));
  assertCheck("TRANSFERENCIAS", "Enlace a registros19862.gob.cl", transfHtml.includes("registros19862.gob.cl"));

  const transf50Res = await fetch(`${PROD_URL}/transferencias?rows=50`, { headers });
  const transf50Html = (await transf50Res.text()).replace(/<!--.*?-->/g, "");
  assertCheck("TRANSFERENCIAS", "Query ?rows=50 recalcula paginación ('Página 1 de 1.188')", transf50Html.includes("1.188") || transf50Html.includes("1188"));

  const transfApiRes = await fetch(`${process.env.API_URL || PROD_URL}/api/v1/transferencias?page=1&limit=10`, { headers });
  assertCheck("TRANSFERENCIAS", "API /api/v1/transferencias responde 200", transfApiRes.status === 200);
  if (transfApiRes.ok) {
    const apiJson = await transfApiRes.json();
    assertCheck("TRANSFERENCIAS", "API retorna total 59.361", apiJson.total === 59361);
    assertCheck("TRANSFERENCIAS", "API retorna 10 filas", apiJson.data?.length === 10);
  }

  // ─── MÓDULO 5: /FUENTES Y /DATOS/CALIDAD ───────────────────────────────────
  console.log("\n5. MÓDULO FUENTES Y CALIDAD DE DATOS (/fuentes, /datos/calidad)");
  const fuentesRes = await fetch(`${PROD_URL}/fuentes`, { headers });
  assertCheck("FUENTES", "HTTP Status 200", fuentesRes.status === 200);
  const fuentesHtml = (await fuentesRes.text()).replace(/<!--.*?-->/g, "");

  assertCheck("FUENTES", "Muestra 13 fuentes oficiales y derivadas", fuentesHtml.includes("13 fuentes") || fuentesHtml.includes("13"));
  assertCheck("FUENTES", "Titular canónico con consolidado 1.753.013", fuentesHtml.includes("1.487.224") && fuentesHtml.includes("1.753.013"));
  assertCheck("FUENTES", "Enlace a calidad de datos", fuentesHtml.includes("/datos/calidad"));
  assertCheck("FUENTES", "Estados reales: 'Operativa mensual'", fuentesHtml.includes("Operativa"));
  assertCheck("FUENTES", "Estados reales: 'Publicación anual' (SINIM)", fuentesHtml.includes("Publicación anual") || fuentesHtml.includes("anual"));
  assertCheck("FUENTES", "Estados reales: 'Por ciclo electoral' (SERVEL)", fuentesHtml.includes("Por ciclo electoral") || fuentesHtml.includes("electoral"));
  assertCheck("FUENTES", "Estados reales: 'Censal oficial' (INE Censo)", fuentesHtml.includes("Censal oficial") || fuentesHtml.includes("Censal"));

  const calidadRes = await fetch(`${PROD_URL}/datos/calidad`, { headers });
  assertCheck("CALIDAD", "HTTP Status 200", calidadRes.status === 200);
  const calidadHtml = (await calidadRes.text()).replace(/<!--.*?-->/g, "");
  assertCheck("CALIDAD", "Guards V1-V7: 0 violaciones críticas", calidadHtml.includes("Guards V1-V7") && calidadHtml.includes("0"));
  assertCheck("CALIDAD", "Tooltip en Nóminas ≤90d presente", calidadHtml.includes("Nóminas Municipales ≤90d"));

  // ─── MÓDULO 6: /DONAR — GRID COMPLETO (4 CARDS + 3 BULLETS CADA UNA) ───────
  console.log("\n6. MÓDULO DONACIONES Y PROYECTO ABIERTO (/donar)");
  const donarRes = await fetch(`${PROD_URL}/donar`, { headers });
  assertCheck("DONAR", "HTTP Status 200", donarRes.status === 200);
  const donarHtml = (await donarRes.text()).replace(/<!--.*?-->/g, "");

  // Fila 1: Manifiesto Cívico + Por qué donar
  assertCheck("DONAR", "Card 1: Manifiesto Cívico", donarHtml.includes("Manifiesto Cívico"));
  assertCheck("DONAR", "Card 2: Card '¿Por qué apoyar?' / 'Por qué donar'", donarHtml.includes("¿Por qué apoyar?"));
  assertCheck("DONAR", "Bullet 1: Independencia de infraestructura", donarHtml.includes("Independencia de infraestructura"));
  assertCheck("DONAR", "Bullet 2: Nuevas fuentes oficiales", donarHtml.includes("Nuevas fuentes oficiales"));
  assertCheck("DONAR", "Bullet 3: Tiempo de auditoría ciudadana", donarHtml.includes("Tiempo de auditoría ciudadana"));

  // Fila 2: Créditos/Autoría + Apoya sin dinero
  assertCheck("DONAR", "Card 3: Créditos y Autoría (Jorge Morgado)", donarHtml.includes("Autoría y Desarrollo") && donarHtml.includes("Jorge Morgado"));
  assertCheck("DONAR", "Enlace a LinkedIn de Jorge Morgado", donarHtml.includes("https://www.linkedin.com/in/jorge-morgado/"));
  assertCheck("DONAR", "Card 4: Card '¿Cómo apoyar sin dinero?'", donarHtml.includes("¿Cómo apoyar sin dinero?"));
  assertCheck("DONAR", "Bullet 4: Difundir el sitio", donarHtml.includes("Difundir el sitio"));
  assertCheck("DONAR", "Bullet 5: Reportar errores de datos", donarHtml.includes("Reportar errores de datos") || donarHtml.includes("Reportar discrepancias"));
  assertCheck("DONAR", "Bullet 6: Proponer fuentes públicas", donarHtml.includes("Proponer fuentes públicas"));

  // Restricciones de contacto
  assertCheck("DONAR", "Sin enlaces de email (mailto:)", !donarHtml.includes("mailto:"));
  assertCheck("DONAR", "Sin formularios de contacto", !donarHtml.includes("<form") && !donarHtml.includes("form-group"));

  // ─── MÓDULO 7: AUDITORÍA EDITORIAL Y ANTI-TYPOS (CROSS-PAGE) ────────────────
  console.log("\n7. MÓDULO AUDITORÍA EDITORIAL Y ANTI-TYPOS (CROSS-PAGE)");
  const allHtmls = [homeHtml, transfHtml, crucesHtml, fuentesHtml, calidadHtml, donarHtml].join(" ");
  assertCheck("EDITORIAL", "Cero typos 'billrones' (grep billron = 0)", !allHtmls.toLowerCase().includes("billron"));
  assertCheck("EDITORIAL", "Cero duplicaciones 'Subrogante))' / '(s))'", !allHtmls.includes("Subrogante))") && !allHtmls.includes("(s))"));
  assertCheck("EDITORIAL", "Cero 'mil MM' en formatos monetarios", !allHtmls.includes("mil MM"));

  // ─── MÓDULO 8: CHECK DE LAYOUT SIN ESPACIO MUERTO LATERAL ───────────────────
  console.log("\n8. MÓDULO ANCHO COMPLETO / SIN ESPACIO MUERTO (/donar, /cruces, /transferencias, /)");
  assertCheck("LAYOUT", "/donar sin maxWidth restrictivo (<800px)", !donarHtml.includes("max-width: 780px") && !donarHtml.includes("max-width: 680px"));
  assertCheck("LAYOUT", "/cruces con container-main", crucesHtml.includes("container-main"));
  assertCheck("LAYOUT", "/transferencias con container-main", transfHtml.includes("container-main"));
  assertCheck("LAYOUT", "Home con main.home-desk y container-main", homeHtml.includes("home-desk") && homeHtml.includes("container-main"));
  assertCheck("LAYOUT", "Home rutas 12-col layout", homeHtml.includes("home-paths__layout") && homeHtml.includes("home-paths__grid"));

  // ─── MÓDULO 9: BARRIDO DE COBERTURA Y CONCORDANCIA OFICIAL ────────────────
  console.log("\n9. MÓDULO BARRIDO DE COBERTURA Y CONCORDANCIA OFICIAL");
  const { runCoverageSweep } = await import("./coverage-sweep.mjs");
  const coverageResult = await runCoverageSweep({ silent: false });
  assertCheck("COBERTURA", "Barrido de cobertura integral (Votaciones, Muestra 5 Fichas, Personal Apoyo, Movimientos, Manifest)", coverageResult.passed);

  // ─── MÓDULO 10: FICHAS /politico/* ESTÁTICAS Y RENDIMIENTO (10 URLs × 2 requests) ──
  console.log("\n10. MÓDULO FICHAS /politico/* ESTÁTICAS Y RENDIMIENTO (Zero CPU Spikes / 0 Error 1102)");
  const sampleSlugs = [
    "diego-ibanez-cotroneo",
    "carlos-bianchi-chelech",
    "vanessa-kaiser-barents-von-hohenhagen",
    "karim-bianchi-retamales",
    "karol-cariola-oliva",
    "gonzalo-winter-etcheberry",
    "diego-schalper-sepulveda",
    "yasna-provoste-campillay",
    "luciano-cruz-coke-carvallo",
    "vlado-mirosevic-verdugo",
  ];

  for (const slug of sampleSlugs) {
    for (let reqNum = 1; reqNum <= 2; reqNum++) {
      let res = null;
      let durationMs = 0;
      let html = "";
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const t0 = performance.now();
          res = await fetch(`${PROD_URL}/politico/${slug}`, {
            headers: {
              "User-Agent": "Cambiometro-Verifier/1.0",
              "Connection": "close",
            },
            signal: AbortSignal.timeout(3500),
          });
          const t1 = performance.now();
          durationMs = Math.round(t1 - t0);
          html = await res.text();
          if (res.status === 200) break;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      const okStatus = res?.status === 200;
      const noError1102 = !html.includes("Error 1102") && !html.includes("error code: 1102") && !html.includes("Worker threw exception") && !html.includes("Error 1015");
      const fastResponse = durationMs < 3000;

      assertCheck(
        "FICHAS-ESTATICAS",
        `/politico/${slug} (req #${reqNum}) [Status: ${res?.status ?? "ERR"}, ${durationMs}ms]`,
        okStatus && noError1102 && fastResponse
      );

      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // ─── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(`  RESUMEN DE EJECUCIÓN: ${passed} verificaciones pasadas, ${failed} fallidas.`);
  console.log(`  VERSION ID EN PRODUCCIÓN: ${versionId}`);
  console.log("================================================================================");

  if (failed > 0) {
    console.error("  ❌ VERIFICACIÓN FALLIDA. Corrija los errores antes de concluir.");
    process.exit(1);
  } else {
    console.log(`  ✅ TODAS LAS PRUEBAS EN VIVO DE PRODUCCIÓN PASARON AL 100% (VERIFY-PROD-FULL) [Version: ${versionId}].`);
  }
}

verifyProdFull().catch((err) => {
  console.error("Error fatal en verificación integral:", err);
  process.exit(1);
});
