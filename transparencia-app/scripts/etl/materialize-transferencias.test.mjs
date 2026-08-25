import assert from "node:assert/strict";
import test from "node:test";
import { transferenciaFromLakeRecord } from "./materialize.mjs";

test("mapea una transferencia oficial al modelo D1 estable", () => {
  const row = transferenciaFromLakeRecord({
    id: "ley-19862-transfer-123",
    sourceId: "ley-19862",
    kind: "transfer",
    occurredAt: "2026-01-02",
    title: "Programa social",
    data: {
      fecha: "2026-01-02",
      period: "2026",
      folio: "123",
      title: "Programa social",
      emitter: { name: "Emisor", rut_juridico: "60.910.000-1" },
      receiver: { name: "Receptor", rut_juridico: "65.046.576-8" },
      monto_clp: "1.234.567",
      url: "https://registros19862.gob.cl/transferencia/123",
      classification: "Social",
      municipality: "Maipu",
    },
  });

  assert.deepEqual(row, {
    id: "ley-19862-transfer-123",
    folio: "123",
    fecha: "2026-01-02",
    periodo: "2026",
    emisorNombre: "Emisor",
    emisorRut: "60.910.000-1",
    receptorNombre: "Receptor",
    receptorRut: "65.046.576-8",
    materia: "Programa social",
    montoClp: 1234567,
    urlRegistro: "https://registros19862.gob.cl/transferencia/123",
    clasificacion: "Social",
    comuna: "Maipu",
  });
});

test("rechaza filas incompletas y fuentes distintas", () => {
  assert.equal(transferenciaFromLakeRecord({ id: "x", sourceId: "otra", data: {} }), null);
  assert.equal(transferenciaFromLakeRecord({
    id: "x",
    sourceId: "ley-19862",
    data: { fecha: "2026-01-02", title: "Sin receptor", monto_clp: 10 },
  }), null);
});
