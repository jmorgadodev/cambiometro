import { createHash } from "node:crypto";
import { test, expect } from "vitest";
import { personalApoyoStaticSubset, verifyPersonalApoyoRelease } from "./personal-apoyo-release.mjs";
import { parsePersonalApoyoStaticPublicationResult, personalApoyoDatasetForStaticRelease, shouldPublishPersonalApoyoCandidate, shouldReconcilePersonalApoyoStaticRelease, shouldRefreshPersonalApoyoPages } from "./personal-apoyo-publication.mjs";

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

test("no publica si sólo cambió la hora de extracción", () => {
  const candidate = { ...dataset, generado_en: "2026-10-10T12:00:00.000Z" };

  expect(shouldPublishPersonalApoyoCandidate(dataset, candidate, minimums)).toBe(false);
});

test("publica si cambió la evidencia de personal de apoyo", () => {
  const candidate = {
    ...dataset,
    generado_en: "2026-10-10T12:00:00.000Z",
    diputados: { "dip-1": { personal_apoyo: [{ nombre: "Persona A" }, { nombre: "Persona C" }] } },
  };

  expect(shouldPublishPersonalApoyoCandidate(dataset, candidate, minimums)).toBe(true);
});

test("Pages sólo se refresca cuando cambian los datos, el release estático o existe un reintento pendiente", () => {
  expect(shouldRefreshPersonalApoyoPages({ contentChanged: false, staticChanged: false, pending: false })).toBe(false);
  expect(shouldRefreshPersonalApoyoPages({ contentChanged: true, staticChanged: false, pending: false })).toBe(true);
  expect(shouldRefreshPersonalApoyoPages({ contentChanged: false, staticChanged: true, pending: false })).toBe(true);
  expect(shouldRefreshPersonalApoyoPages({ contentChanged: false, staticChanged: false, pending: true })).toBe(true);
});

test("una extracción sin cambios reutiliza el snapshot publicado y no reescribe un static release pendiente", () => {
  const sameContent = { ...dataset, generado_en: "2026-10-10T12:00:00.000Z" };

  expect(personalApoyoDatasetForStaticRelease(dataset, sameContent, false)).toBe(dataset);
  expect(personalApoyoDatasetForStaticRelease(dataset, sameContent, true)).toBe(sameContent);
  expect(shouldReconcilePersonalApoyoStaticRelease({ contentChanged: false, pending: true })).toBe(false);
  expect(shouldReconcilePersonalApoyoStaticRelease({ contentChanged: false, pending: false })).toBe(true);
  expect(shouldReconcilePersonalApoyoStaticRelease({ contentChanged: true, pending: true })).toBe(true);
});

test("extrae el resultado JSON de Wrangler aunque incluya su banner en stdout", () => {
  const output = `\n ⛅️ wrangler\n──────────────────\n{\n  "action": "published",\n  "releaseId": "release-1",\n  "storageBudget": {\n    "currentBytes": 1\n  }\n}\n`;

  expect(parsePersonalApoyoStaticPublicationResult(output)).toEqual({
    action: "published",
    releaseId: "release-1",
    storageBudget: { currentBytes: 1 },
  });
  expect(() => parsePersonalApoyoStaticPublicationResult("wrangler error")).toThrow("PERSONAL_APOYO_STATIC_PUBLICATION_RESULT_INVALID");
});
