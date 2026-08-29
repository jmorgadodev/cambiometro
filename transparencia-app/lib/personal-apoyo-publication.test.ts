import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertUsableOfficialHtml,
  mergePersonalApoyoDeputies,
  splitPersonalApoyoJson,
  validatePersonalApoyoDataset,
} from "../scripts/etl/personal-apoyo-publication.mjs";

describe("publicación del personal de apoyo", () => {
  const valid = {
    generado_en: "2026-08-13T12:00:00.000Z",
    fuentes: { camara: { url: "https://www.camara.cl/oficial", nota: "Fuente oficial" } },
    meses_senado_disponibles: ["2026-07"],
    diputados: {
      "1218": {
        mes_personal: "junio 2026",
        personal_apoyo: [{ tipo: "Honorarios", nombre: "Persona Pública", cargo: "Asesoría", sueldo: 1000 }],
      },
    },
    senadores: {
      "Oficina Senador": [{ periodo: "2026-07", nombre: "Persona Pública", monto: 2000 }],
    },
  };

  it("cuenta personas publicadas por cada cámara", () => {
    expect(validatePersonalApoyoDataset(valid, { diputados: 1, filasCamara: 1, oficinasSenado: 1, filasSenado: 1 })).toMatchObject({
      diputados: 1,
      filasCamara: 1,
      oficinasSenado: 1,
      filasSenado: 1,
      recordCount: 2,
    });
  });

  it("rechaza un archivo vacío para no reemplazar el último lote válido", () => {
    expect(() => validatePersonalApoyoDataset({ ...valid, diputados: {}, senadores: {} }))
      .toThrow("PERSONAL_APOYO_EMPTY");
  });

  it("bloquea una caida anormal aunque el archivo no este vacio", () => {
    expect(() => validatePersonalApoyoDataset(valid))
      .toThrow("PERSONAL_APOYO_COUNT_BELOW_MINIMUM");
  });

  it("divide el JSON en fragmentos rearmables para D1", () => {
    const json = JSON.stringify(valid);
    expect(splitPersonalApoyoJson(json, 80).join("")).toBe(json);
    expect(splitPersonalApoyoJson(json, 80).length).toBeGreaterThan(1);
  });

  it("conserva el ultimo registro oficial de un diputado que sale de la nomina vigente", () => {
    const historical = {
      "1002": {
        mes_personal: "marzo 2026",
        personal_apoyo: [{ nombre: "PERSONA PUBLICADA", cargo: "Asesor", sueldo: 449171 }],
      },
    };
    const refreshed = {
      "1077": {
        mes_personal: "julio 2026",
        personal_apoyo: [{ nombre: "PERSONA VIGENTE", cargo: "Profesional", sueldo: 1000000 }],
      },
    };

    expect(mergePersonalApoyoDeputies(historical, refreshed)).toMatchObject({
      "1002": historical["1002"],
      "1077": refreshed["1077"],
    });
  });

  it("conserva la ficha anterior si la fuente nueva no trae identidad", () => {
    const previous: Record<string, Record<string, unknown>> = {
      "1009": {
        ficha: { region: "Metropolitana", partido: "Independiente" },
        personal_apoyo: [{ nombre: "PERSONA PUBLICADA", sueldo: 449171 }],
        mes_personal: "julio 2026",
      },
    };
    const refreshed: Record<string, Record<string, unknown>> = {
      "1009": {
        ficha: { region: null, partido: null },
        personal_apoyo: [{ nombre: "PERSONA NUEVA", sueldo: 500000 }],
        mes_personal: "agosto 2026",
      },
    };

    const merged = mergePersonalApoyoDeputies(previous, refreshed) as Record<string, Record<string, unknown>>;
    expect(merged["1009"]).toMatchObject({
      ficha: previous["1009"].ficha,
      personal_apoyo: refreshed["1009"].personal_apoyo,
    });
  });

  it("rechaza una página de bloqueo antes de publicar datos", () => {
    expect(() => assertUsableOfficialHtml("<html>Attention Required! | Cloudflare</html>", "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_BLOCKED");
    expect(() => assertUsableOfficialHtml("<html>ok</html>", "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_EMPTY");
    expect(assertUsableOfficialHtml("<html>" + "x".repeat(300) + "</html>", "camara")).toContain("xxx");
  });

  it("el ETL automatico preserva historia y no vuelve a borrar IDs fuera de nomina", () => {
    const etl = readFileSync(resolve("scripts/etl-personal-apoyo.mjs"), "utf8");
    expect(etl).toContain("mergePersonalApoyoDeputies(previo?.diputados ?? {}, diputadosActualizados)");
    expect(etl).not.toContain("delete diputados[");
  });

  it("mantiene cada sentencia bajo el límite práctico de D1", () => {
    const chunks = splitPersonalApoyoJson("x".repeat(240_000));
    expect(Math.max(...chunks.map((chunk) => chunk.length))).toBeLessThanOrEqual(80_000);
  });

  it("activa el manifiesto corriente solo despues de publicar la proyeccion D1", () => {
    const publisher = readFileSync(resolve("scripts/publish-personal-apoyo.mjs"), "utf8");
    const d1Activation = publisher.indexOf('wrangler(["d1", "execute"');
    const manifestActivation = publisher.indexOf("${bucket}/projections/personal-apoyo-v1/manifest.json");
    expect(d1Activation).toBeGreaterThan(-1);
    expect(manifestActivation).toBeGreaterThan(d1Activation);
    expect(publisher).toContain("PERSONAL_APOYO_MANIFEST_ACTIVATION_FAILED");
  });

  it("el workflow parlamentario parte de la ultima proyeccion valida para conservar historia", () => {
    const workflow = readFileSync(resolve("..", ".github", "workflows", "etl-daily.yml"), "utf8");
    const personalWorkflow = readFileSync(resolve("..", ".github", "workflows", "etl-personal-apoyo.yml"), "utf8");
    expect(workflow).not.toContain("projections/personal-apoyo-v1/personal-apoyo.json");
    expect(personalWorkflow).toContain("projections/personal-apoyo-v1/personal-apoyo.json");
    expect(personalWorkflow).toContain("--input /tmp/personal-apoyo-current.json");
    expect(personalWorkflow).toContain("--output /tmp/personal-apoyo-next.json");
    expect(personalWorkflow).toContain("--input /tmp/personal-apoyo-next.json");
    expect(personalWorkflow).toContain('cron: "0 7 * * *"');
  });
});
