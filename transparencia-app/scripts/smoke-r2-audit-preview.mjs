#!/usr/bin/env node
const base = process.argv[2]?.replace(/\/$/, "");
if (!base || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(base)) {
  throw new Error("Se requiere la URL workers.dev del preview aislado.");
}

async function page(offset, period) {
  const url = new URL("/api/v1/records", base);
  url.searchParams.set("source", "contraloria");
  url.searchParams.set("limit", "2");
  url.searchParams.set("offset", String(offset));
  if (period) url.searchParams.set("period", period);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Contraloría preview respondió HTTP ${response.status} en offset ${offset}.`,
    );
  return response.json();
}

async function waitForPublishedAvailablePage(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  let lastMeta = null;
  while (Date.now() < deadline) {
    const response = await page(0);
    lastMeta = response.meta ?? {};
    if (
      lastMeta.sourceBackend === "r2-lake" &&
      lastMeta.totalScope === "published-available" &&
      (response.data ?? []).length > 0
    ) {
      return response;
    }
    // A newly deployed workers.dev version can briefly serve the previous
    // edge version. Poll the actual API contract instead of sleeping a fixed
    // amount, and keep a firm bound so a bad deployment still fails quickly.
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw new Error(
    `El preview no alcanzó published-available en ${timeoutMs}ms; último meta: ${JSON.stringify(lastMeta)}.`,
  );
}

const first = await waitForPublishedAvailablePage();
const second = await page(2);
const julyFirst = await page(0, "2026-07");
const julySecond = await page(2, "2026-07");
const a = first.meta ?? {};
const b = second.meta ?? {};
const julyA = julyFirst.meta ?? {};
const julyB = julySecond.meta ?? {};
const ids = [...(julyFirst.data ?? []), ...(julySecond.data ?? [])].map(
  (record) => record.id,
);

if (a.sourceBackend !== "r2-lake" || b.sourceBackend !== "r2-lake")
  throw new Error("La consulta no se atendió desde el lago R2.");
if (a.totalScope !== "published-available" || b.totalScope !== "published-available")
  throw new Error("El total no declara el alcance de registros disponibles.");
if (
  a.total !== b.total ||
  a.total > a.expectedRows ||
  b.total > b.expectedRows ||
  !(first.data ?? []).length ||
  !(second.data ?? []).length
)
  throw new Error(
    "El total disponible cambia/supera el esperado o la primera página está vacía pese a existir particiones disponibles.",
  );
if (a.nextCursor !== "v1_2" || b.nextCursor !== "v1_4")
  throw new Error("Los cursores no avanzan de forma estable.");
if (a.sourceStatus !== "partial" || a.missingPartitions < 1)
  throw new Error("El endpoint no informa la partición faltante del catálogo.");
if (
  julyA.sourceStatus !== "complete" ||
  julyA.total !== julyB.total ||
  julyA.total !== julyA.expectedRows ||
  julyA.nextCursor !== "v1_2" ||
  julyB.nextCursor !== "v1_4"
)
  throw new Error(
    "La partición consultable de julio no pagina con conteos y cursores estables.",
  );
if ((julyFirst.data ?? []).length !== 2 || (julySecond.data ?? []).length !== 2)
  throw new Error(
    "La paginación de julio no entregó dos filas en cada página.",
  );
if (new Set(ids).size !== ids.length)
  throw new Error("La paginación de julio repitió IDs entre las dos páginas.");

console.log(
  JSON.stringify(
    {
      status: "ok",
      sourceBackend: a.sourceBackend,
      total: a.total,
      expectedRows: a.expectedRows,
      totalScope: a.totalScope,
      publishedRows: julyA.publishedRows,
      sourceStatus: a.sourceStatus,
      missingPartitions: a.missingPartitions,
      unfilteredPage1Cursor: a.nextCursor,
      unfilteredPage2Cursor: b.nextCursor,
      julyTotal: julyA.total,
      julyPage1Cursor: julyA.nextCursor,
      julyPage2Cursor: julyB.nextCursor,
      distinctIds: ids.length,
    },
    null,
    2,
  ),
);
