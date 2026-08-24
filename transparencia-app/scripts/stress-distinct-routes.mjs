import assert from "node:assert";

const BASE_URL = process.env.VERIFY_BASE_URL || "https://cambiometro.impulsacv.cl";

const DISTINCT_20_URLS = [
  "/",
  "/politico/vanessa-kaiser-barents-von-hohenhagen",
  "/politico/jorge-diaz-ibarra",
  "/politico/luis-malla-valenzuela",
  "/politico/stephanie-jeldrez-ortiz",
  "/politico/alvaro-jofre-caceres",
  "/politico/carlos-carvajal-gallardo",
  "/politico/ximena-naranjo-pinto",
  "/politico/miguel-becker-alvear",
  "/municipalidades",
  "/municipalidades/santiago",
  "/municipalidades/las-condes",
  "/datos",
  "/cruces",
  "/servicios-publicos",
  "/servicios-publicos/subsecretaria-del-interior",
  "/como-funciona",
  "/transferencias",
  "/movimientos",
  "/privacidad",
];

async function runStress() {
  console.log(`=== STRESS TEST: 20 RUTAS / FICHAS DISTINTAS ===`);
  console.log(`Target: ${BASE_URL}`);

  const results = [];
  for (let i = 0; i < DISTINCT_20_URLS.length; i++) {
    const route = DISTINCT_20_URLS[i];
    const url = `${BASE_URL}${route}`;
    const t0 = Date.now();
    const res = await fetch(url);
    const ms = Date.now() - t0;
    const body = await res.text();

    const ok = res.status === 200 && !body.includes("This page couldn't load") && !body.includes("error 1102");
    results.push({ i: i + 1, route, status: res.status, ms, ok });
    console.log(`[${String(i + 1).padStart(2, "0")}/20] ${route.padEnd(48)} -> HTTP ${res.status} (${ms}ms) ${ok ? "OK" : "FAIL"}`);
    
    // Pausa breve de 150ms para evitar rate limiting por ráfaga
    await new Promise((r) => setTimeout(r, 150));
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nResultado Stress: ${passed}/20 exitosos`);
  assert(passed === 20, `Se esperaba 20/20 pero solo pasaron ${passed}/20`);
  console.log("=== STRESS TEST 20/20 SUPERADO CON ÉXITO ===");
}

runStress().catch((err) => {
  console.error("Fallo en stress test:", err);
  process.exit(1);
});
