import test from "node:test";
import assert from "node:assert/strict";
import { assertChileCompraReleaseUsable } from "./chilecompra-release-guard.mjs";

test("rechaza un corte ChileCompra vacío para no publicar cero registros", () => {
  assert.throws(
    () => assertChileCompraReleaseUsable({
      result: {
        period: "2026-09",
        listingCounts: { licitacion: 0, trato_directo: 0, convenio_marco: 0 },
        documents: [],
        records: [],
      },
      projectedRecords: [],
    }),
    /CHILECOMPRA_RELEASE_EMPTY_OR_UNAVAILABLE/,
  );
});

test("acepta un corte con listados, documentos y registros", () => {
  assert.deepEqual(
    assertChileCompraReleaseUsable({
      result: {
        period: "2026-07",
        listingCounts: { licitacion: 8_004, trato_directo: 9_361, convenio_marco: 17_364 },
        documents: [{ url: "https://api.example.test/ocds/1" }],
        records: [{ id: "ocds-1" }],
      },
      projectedRecords: [{ id: "ocds-1" }],
    }),
    {
      period: "2026-07",
      listings: 34_729,
      documents: 1,
      records: 1,
      projectedRecords: 1,
    },
  );
});
