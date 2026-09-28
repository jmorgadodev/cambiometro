#!/usr/bin/env node
const base = process.argv[2]?.replace(/\/$/, "");
if (!base || !/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(base)) {
  throw new Error("Se requiere la URL workers.dev del preview aislado.");
}

async function page(offset) {
  const url = new URL("/api/v1/records", base);
  url.searchParams.set("source", "contraloria");
  url.searchParams.set("limit", "2");
  url.searchParams.set("offset", String(offset));
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(
      `Contraloría preview respondió HTTP ${response.status} en offset ${offset}.`,
    );
  return response.json();
}

const first = await page(0);
const second = await page(2);
const a = first.meta ?? {};
const b = second.meta ?? {};
const ids = [...(first.data ?? []), ...(second.data ?? [])].map(
  (record) => record.id,
);

if (a.sourceBackend !== "r2-lake" || b.sourceBackend !== "r2-lake")
  throw new Error("La consulta no se atendió desde el lago R2.");
if (a.totalScope !== "catalog-expected" || b.totalScope !== "catalog-expected")
  throw new Error("El total no declara el alcance esperado del catálogo.");
if (
  a.total !== b.total ||
  a.total !== a.expectedRows ||
  b.total !== b.expectedRows
)
  throw new Error(
    "El total/expectedRows cambia entre páginas o no coincide con el catálogo.",
  );
if (a.nextCursor !== "v1_2" || b.nextCursor !== "v1_4")
  throw new Error("Los cursores no avanzan de forma estable.");
if (new Set(ids).size !== ids.length)
  throw new Error("La paginación repitió IDs entre las dos páginas.");

console.log(
  JSON.stringify(
    {
      status: "ok",
      sourceBackend: a.sourceBackend,
      total: a.total,
      expectedRows: a.expectedRows,
      publishedRows: a.publishedRows,
      sourceStatus: a.sourceStatus,
      missingPartitions: a.missingPartitions,
      page1Cursor: a.nextCursor,
      page2Cursor: b.nextCursor,
      distinctIds: ids.length,
    },
    null,
    2,
  ),
);
