import assert from "node:assert/strict";
import test from "node:test";
import { buildLey19862Projection } from "./ley19862-projection.mjs";

const record = (id, amount, overrides = {}) => ({
  id,
  fecha: "2026-01-02",
  period: "2026",
  title: null,
  description: null,
  classification: null,
  emitter: { rut_juridico: "60.910.000-1", name: "EMISOR", class: null },
  receiver: { rut_juridico: "65.046.576-8", name: "RECEPTOR", class: null },
  monto_clp: amount,
  url: `https://registros19862.gob.cl/transferencia/${id}`,
  municipality: null,
  ...overrides,
});

test("calcula KPIs, serie y rankings desde filas oficiales", () => {
  const result = buildLey19862Projection([record("2", 20), record("1", 10)], {
    generatedAt: "2026-08-21T00:00:00.000Z",
  });
  assert.deepEqual(result.kpis, {
    total_monto_clp: 30,
    total_transfers: 2,
    total_receptores: 1,
    total_emisores: 1,
  });
  assert.deepEqual(result.by_year, { "2026": { count: 2, total: 30 } });
  assert.equal(result.top_receptores[0].total_clp, 30);
  assert.deepEqual(result.transfers_sample.map(({ id }) => id), ["1", "2"]);
});

test("preserva ausencias como null y nunca inventa texto", () => {
  const result = buildLey19862Projection([record("1", 0)], { sampleSize: 1 });
  assert.equal(result.transfers_sample[0].title, null);
  assert.equal(result.transfers_sample[0].classification, null);
  assert.equal(result.transfers_sample[0].municipality, null);
  assert.equal(result.transfers_sample[0].monto_clp, 0);
});

test("rechaza folios duplicados", () => {
  assert.throws(
    () => buildLey19862Projection([record("1", 10), record("1", 10)]),
    /LEY_19862_DUPLICATE_ID/,
  );
});

test("colapsa duplicados por ID cuando el release se reconstruye con solapamiento", () => {
  const result = buildLey19862Projection([record("1", 10), record("1", 10)], { dedupeById: true });
  assert.equal(result.source.sourceRows, 2);
  assert.equal(result.source.duplicateExactRows, 1);
  assert.equal(result.source.duplicateConflictingRows, 0);
  assert.equal(result.kpis.total_transfers, 1);
  assert.equal(result.kpis.total_monto_clp, 10);
});

test("conserva la versión más reciente de un folio contradictorio y lo cuenta", () => {
  const result = buildLey19862Projection([
    record("1", 10, { registered_at: "2026-08-01" }),
    record("1", 11, { registered_at: "2026-08-24" }),
  ], { dedupeById: true });
  assert.equal(result.source.duplicateConflictingRows, 1);
  assert.equal(result.kpis.total_transfers, 1);
  assert.equal(result.kpis.total_monto_clp, 11);
});
