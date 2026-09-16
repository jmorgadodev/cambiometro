/**
 * Verificación de producción para Remuneraciones públicas.
 *
 * Comprueba sólo contratos públicos y búsquedas pequeñas. No descarga el
 * universo de Transparencia Activa ni consulta D1 de forma masiva.
 */

const base = (process.env.PROD_URL || "https://cambiometro.impulsacv.cl").replace(/\/$/, "");
const headers = {
  "User-Agent": "Cambiometro-RemuneracionesVerifier/1.0",
  "Cache-Control": "no-cache",
};
if (process.env.UPTIME_TOKEN?.trim()) headers["X-Cambiometro-Uptime-Token"] = process.env.UPTIME_TOKEN.trim();

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL");
}

function assert(condition, message, details = "") {
  if (!condition) throw new Error(`REMUNERACIONES_VERIFY_FAILED:${message}${details ? ` (${details})` : ""}`);
  console.log(`✅ ${message}${details ? ` (${details})` : ""}`);
}

async function getJson(pathname, attempts = 3) {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`${base}${pathname}`, { headers, signal: AbortSignal.timeout(20_000) });
    const text = await response.text();
    last = { response, text };
    if (response.ok) return { response, value: JSON.parse(text) };
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }
  throw new Error(`HTTP ${last?.response?.status ?? "ERR"} para ${pathname}`);
}

async function main() {
  const pageResponse = await fetch(`${base}/remuneraciones-publicas/`, { headers, signal: AbortSignal.timeout(20_000) });
  const pageHtml = await pageResponse.text();
  assert(pageResponse.status === 200, "/remuneraciones-publicas responde 200", `status: ${pageResponse.status}`);
  assert(pageHtml.includes("Encuentra un pago publicado"), "la página conserva el buscador público");
  assert(pageHtml.includes("Registro 38 bis"), "la página conserva la fuente Registro 38 bis");
  assert(!pageHtml.includes("El navegador carga sólo la página solicitada"), "la página no expone textos internos de infraestructura");

  const manifestResult = await getJson("/data/remuneraciones-unified/manifest.json");
  const manifest = manifestResult.value;
  assert(manifest?.schemaVersion === 1, "manifiesto unificado con schemaVersion 1");
  assert(Number.isInteger(manifest?.totalRows) && manifest.totalRows > 0, "manifiesto declara registros consultables", `total: ${manifest?.totalRows ?? "n/a"}`);
  assert(Number.isInteger(manifest?.pageCount) && manifest.pageCount > 0, "manifiesto declara paginación");
  assert(Array.isArray(manifest?.sources) && manifest.sources.some((source) => source.id === "transparencia-activa"), "manifiesto conserva Transparencia Activa");
  assert(Array.isArray(manifest?.sources) && manifest.sources.some((source) => source.id === "remuneraciones-38bis"), "manifiesto conserva Registro 38 bis");

  const indexResult = await getJson(`/data/remuneraciones-unified/${manifest.searchIndexKey}`);
  const index = indexResult.value;
  assert(index && typeof index === "object", "índice de búsqueda unificado disponible");
  // El índice estático cubre los releases unificados disponibles localmente;
  // Transparencia Activa se consulta por su endpoint paginado y no se replica
  // aquí. Verificamos el contrato del índice contra una fila real del primer
  // bloque, sin exigir que apellidos CPLT estén duplicados en R2 estático.
  const firstPageKey = manifest.pages?.[0]?.key;
  const firstPageResult = firstPageKey ? await getJson(`/data/remuneraciones-unified/${firstPageKey}`) : { value: [] };
  const firstRow = Array.isArray(firstPageResult.value) ? firstPageResult.value[0] : null;
  const indexToken = String(`${firstRow?.nombreOriginal ?? ""} ${firstRow?.organismoOriginal ?? ""} ${firstRow?.cargoOriginal ?? ""}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .split(/[^a-z0-9]+/)
    .find((token) => token.length >= 4);
  assert(Boolean(indexToken) && Array.isArray(index[indexToken]) && index[indexToken].length > 0, "índice enlaza al menos una fila estática");

  const queries = [
    { label: "Lucy Depablos", query: "Lucy Depablos", min: 1, name: "lucy depablos" },
    { label: "Sofía Pumpin", query: "Sofía Pumpin", min: 1, name: "sofia pumpin" },
    { label: "María Victoria Raimann Pumpin", query: "María Victoria Raimann Pumpin", min: 1, name: "maria victoria raimann pumpin" },
    { label: "Independencia", query: "Independencia", min: 1, name: "" },
  ];
  const results = [];
  for (const item of queries) {
    const encoded = encodeURIComponent(item.query);
    const { value } = await getJson(`/api/funcionarios?scope=all&query=${encoded}&include_zero=true&limit=20&sortBy=nombre_asc`);
    const rows = Array.isArray(value?.data) ? value.data : [];
    const total = Number(value?.total ?? value?.meta?.total ?? rows.length);
    assert(total >= item.min && rows.length > 0, `búsqueda ${item.label} devuelve datos`, `total: ${total}`);
    if (item.name) {
      assert(rows.some((row) => normalize(row.nombre_completo).includes(item.name)), `búsqueda ${item.label} conserva el nombre publicado`);
    }
    results.push({ query: item.label, total, returned: rows.length });
  }

  console.log(JSON.stringify({
    ok: true,
    base,
    manifest: { totalRows: manifest.totalRows, pageCount: manifest.pageCount, generatedAt: manifest.generatedAt },
    searches: results,
  }, null, 2));
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
