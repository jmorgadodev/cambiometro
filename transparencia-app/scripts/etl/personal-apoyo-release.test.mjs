import { createHash } from "node:crypto";
import { test, expect } from "vitest";
import { personalApoyoStaticSubset, verifyPersonalApoyoRelease } from "./personal-apoyo-release.mjs";

const dataset = {
  generado_en: "2026-09-29T00:00:00.000Z",
  meses_senado_disponibles: ["2026-08"],
  diputados: { "dip-1": { personal_apoyo: [{ nombre: "Persona A" }] } },
  senadores: { "sen-1": [{ nombre: "Persona B" }] },
};
const buffer = Buffer.from(JSON.stringify(dataset));
const manifest = {
  schemaVersion: "1.0.0",
  sourceId: "personal-apoyo",
  generatedAt: dataset.generado_en,
  checksumSha256: createHash("sha256").update(buffer).digest("hex"),
  diputados: 1,
  filasCamara: 1,
  oficinasSenado: 1,
  filasSenado: 1,
  recordCount: 2,
};
const minimums = { diputados: 1, filasCamara: 1, oficinasSenado: 1, filasSenado: 1 };

test("acepta solo el release íntegro y mantiene el mes del Senado en el subset", () => {
  const result = verifyPersonalApoyoRelease(buffer, manifest, minimums);
  expect(result.counts.recordCount).toBe(2);
  expect(personalApoyoStaticSubset(result.dataset).meses_senado_disponibles).toEqual(["2026-08"]);
});

test("incluye todas las oficinas del Senado y no excluye senadores después del décimo", () => {
  const senadores = Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`sen-${index + 1}`, [{ nombre: `Asesor ${index + 1}` }]]),
  );

  const subset = personalApoyoStaticSubset({ ...dataset, senadores });

  expect(Object.keys(subset.senadores)).toHaveLength(12);
  expect(subset.senadores["sen-12"]).toEqual([{ nombre: "Asesor 12" }]);
});

test("rechaza checksums, fechas y conteos divergentes antes de escribir Pages", () => {
  expect(() => verifyPersonalApoyoRelease(buffer, { ...manifest, checksumSha256: "0".repeat(64) }, minimums)).toThrow(/CHECKSUM_MISMATCH/);
  expect(() => verifyPersonalApoyoRelease(buffer, { ...manifest, generatedAt: "2026-01-01T00:00:00.000Z" }, minimums)).toThrow(/DATE_MISMATCH/);
  expect(() => verifyPersonalApoyoRelease(buffer, { ...manifest, filasSenado: 0 }, minimums)).toThrow(/COUNT_MISMATCH:filasSenado/);
});
