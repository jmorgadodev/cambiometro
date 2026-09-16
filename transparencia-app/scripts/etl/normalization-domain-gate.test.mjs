import { describe, expect, it } from "vitest";
import {
  NORMALIZATION_DOMAIN_CHECKS,
  runNormalizationDomainChecks,
  summarizeDomainResults,
} from "../normalization-domain-gate.mjs";

describe("compuerta de normalización por dominio", () => {
  it("incluye las fuentes locales críticas sin materializar D1", () => {
    expect(NORMALIZATION_DOMAIN_CHECKS.map((check) => check.id)).toEqual([
      "movimientos",
      "camara-senado",
      "remuneraciones-historial",
      "remuneraciones-unificadas",
      "entradas-estaticas",
      "municipalidades-fallback",
    ]);
  });

  it("bloquea la promoción si un dominio falla", () => {
    const result = summarizeDomainResults([
      { id: "ok", script: "ok.mjs", status: "ok", exitCode: 0, report: {} },
      { id: "fallo", script: "fallo.mjs", status: "failed", exitCode: 1, report: {} },
    ]);
    expect(result).toMatchObject({ status: "blocked", failed: ["fallo"], publicD1Reads: 0, publicR2Writes: 0 });
  });

  it("permite el checkout limpio cuando faltan artefactos generados y los deja visibles como omitidos", () => {
    const result = summarizeDomainResults([
      { id: "ok", script: "ok.mjs", status: "ok", exitCode: 0, report: {} },
      { id: "faltante", script: "faltante.mjs", status: "skipped", exitCode: 1, report: {} },
    ]);
    expect(result).toMatchObject({ status: "partial", failed: [], skipped: ["faltante"] });
  });

  it("ejecuta cada validador de manera secuencial y resume el resultado", () => {
    const called = [];
    const result = runNormalizationDomainChecks({
      checks: [
        { id: "uno", script: "uno.mjs" },
        { id: "dos", script: "dos.mjs" },
      ],
      spawn(_node, args) {
        called.push(args.at(-1));
        return { status: 0, stdout: JSON.stringify({ ok: true }), stderr: "" };
      },
    });
    expect(called.map((value) => value.split(/[\\/]/).at(-1))).toEqual(["uno.mjs", "dos.mjs"]);
    expect(result).toMatchObject({ status: "ok", failed: [], publicD1Reads: 0, publicR2Writes: 0 });
  });

  it("clasifica un artefacto ausente como omitido sólo con la opción explícita", () => {
    const result = runNormalizationDomainChecks({
      checks: [{ id: "faltante", script: "faltante.mjs" }],
      allowMissingArtifacts: true,
      spawn() {
        return { status: 1, stdout: "", stderr: "Error: ENOENT: no such file or directory" };
      },
    });
    expect(result).toMatchObject({ status: "partial", failed: [], skipped: ["faltante"] });
  });
});
