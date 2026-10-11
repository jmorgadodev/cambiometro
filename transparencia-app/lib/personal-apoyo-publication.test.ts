import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertUsableOfficialHtml,
  assertUsableOfficialResponse,
  mergeCamaraOfficialProfiles,
  mergeCamaraOpenDataProfiles,
  mergePersonalApoyoDeputies,
  isCamaraAccessBlock,
  splitPersonalApoyoJson,
  validatePersonalApoyoDataset,
} from "../scripts/etl/personal-apoyo-publication.mjs";

describe("publicación del personal de apoyo", () => {
  it("incorpora perfiles oficiales por ID sin perder campos que la respuesta no trae", () => {
    const current = {
      diputados: {
        "1009": {
          ficha: { partido: null, telefono: "+56 2 1234", redes: { x: "https://x.com/diputado" } },
          personal_apoyo: [{ nombre: "Asesora vigente" }],
        },
      },
    };
    const next = mergeCamaraOfficialProfiles(current, {
      "1009": {
        name: "Jorge Alessandri Vergara",
        comunas_distrito: "Santiago, Ñuñoa",
        numero_distrito: 10,
        region: "Región Metropolitana",
        periodo: "2026-2030",
        periodos: ["2018-2022", "2022-2026", "2026-2030"],
        partido: "Unión Demócrata Independiente",
        bancada: "Unión Demócrata Independiente",
        email: "diputado@congreso.cl",
        redes: { instagram: "https://instagram.com/diputado" },
        enlaces_publicos: [{ label: "Instagram", url: "https://instagram.com/diputado" }],
      },
    }, "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}", "2026-10-10");

    expect(next.diputados["1009"]).toMatchObject({
      ficha: {
        comunas_distrito: "Santiago, Ñuñoa",
        numero_distrito: 10,
        region: "Región Metropolitana",
        periodo: "2026-2030",
        partido: "Unión Demócrata Independiente",
        bancada: "Unión Demócrata Independiente",
        periodos: ["2018-2022", "2022-2026", "2026-2030"],
        telefono: "+56 2 1234",
        email: "diputado@congreso.cl",
        redes: { x: "https://x.com/diputado", instagram: "https://instagram.com/diputado" },
        enlaces_publicos: [{ label: "Instagram", url: "https://instagram.com/diputado" }],
        perfil_fuente: "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1009",
        perfil_verificado_en: "2026-10-10",
      },
      personal_apoyo: [{ nombre: "Asesora vigente" }],
    });
  });

  it("actualiza partido por ID de Cámara y conserva el resto de la ficha y datos", () => {
    const current = {
      generado_en: "2026-10-10T00:00:00.000Z",
      diputados: {
        "1009": {
          ficha: { partido: null, bancada: "Bancada conservada", region: "Región publicada" },
          personal_apoyo: [{ nombre: "Asesor existente" }],
          transparencia_camara: { pasajes_aereos_nacionales: { status: "available", rows: [{ values: { Fecha: "2026-09-01" } }] } },
        },
      },
    };

    const next = mergeCamaraOpenDataProfiles(current, {
      "1009": { partido: "Unión Demócrata Independiente", source_url: "https://opendata.camara.cl/ficha" },
      "1177": { partido: "No crear autoridades ajenas al corte" },
    });

    expect(next.diputados["1009"]).toMatchObject({
      ficha: { partido: "Unión Demócrata Independiente", partido_fuente: "https://opendata.camara.cl/ficha", bancada: "Bancada conservada", region: "Región publicada" },
      personal_apoyo: [{ nombre: "Asesor existente" }],
      transparencia_camara: { pasajes_aereos_nacionales: { status: "available" } },
    });
    expect(next.diputados["1177"]).toBeUndefined();
  });

  it("rehidrata Personal de Apoyo desde el release R2 vigente incluso si Pages restaura caché", () => {
    const workflow = readFileSync(resolve("..", ".github", "workflows", "pages-static-refresh.yml"), "utf8");
    const hydration = workflow.indexOf("Rehidratar Personal de Apoyo desde el release vigente de R2");
    const releaseSet = workflow.indexOf("Fijar ReleaseSet de entradas estáticas y validar bytes locales");
    const build = workflow.indexOf("Construir Pages estático");
    const nextStep = workflow.indexOf("\n      - name:", hydration + 1);
    const hydrationStep = workflow.slice(hydration, nextStep);

    expect(hydration).toBeGreaterThan(releaseSet);
    expect(hydration).toBeLessThan(build);
    expect(hydrationStep).toContain("projections/personal-apoyo-v1/manifest.json");
    expect(hydrationStep).toContain("projections/personal-apoyo-v1/personal-apoyo.json");
    expect(hydrationStep).toContain("node scripts/verify-personal-apoyo-release.mjs");
    expect(hydrationStep).not.toContain("if: steps.data-cache.outputs.cache-hit");
  });

  for (const workflowFile of ["etl-personal-apoyo.yml", "etl-personal-apoyo-senado.yml"]) {
    it(`${workflowFile} exige checksum del release R2 y nunca restaura un baseline Git`, () => {
      const workflow = readFileSync(resolve("..", ".github", "workflows", workflowFile), "utf8");
      expect(workflow).toContain("projections/personal-apoyo-v1/manifest.json");
      expect(workflow).toContain("node scripts/verify-personal-apoyo-release.mjs");
      expect(workflow).not.toContain("cp data/personal-apoyo.json /tmp/personal-apoyo-current.json");
      expect(workflow.indexOf("node scripts/verify-personal-apoyo-release.mjs"))
        .toBeLessThan(workflow.indexOf("npm run etl:personal-apoyo"));
    });
    it(`${workflowFile} permite comprobar el baseline sin extraer ni publicar datos`, () => {
      const workflow = readFileSync(resolve("..", ".github", "workflows", workflowFile), "utf8");
      expect(workflow).toContain("verify_release_only:");
      expect(workflow.match(/if: inputs\.verify_release_only != true/g)).toHaveLength(3);
      expect(workflow).toContain("if: always() && inputs.verify_release_only != true");
    });
  }
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

  it("fusiona una ficha parcial campo a campo sin borrar contacto ni períodos", () => {
    const previous = {
      "1009": {
        ficha: {
          comunas_distrito: "Santiago, Ñuñoa", numero_distrito: 10, region: "Región Metropolitana",
          periodo: "2026-2030", partido: "Partido anterior", bancada: "Bancada anterior",
          periodos: ["2022-2026", "2026-2030"], telefono: "+56 2 1234", email: "diputado@camara.cl",
          redes: { x: "https://x.com/diputado" }, perfil_fuente: "https://www.camara.cl/perfil/1009",
        },
      },
    };
    const refreshed = {
      "1009": {
        ficha: {
          comunas_distrito: null, numero_distrito: null, region: "Región actualizada", periodo: "2026-2030",
          partido: "Partido nuevo", bancada: null, periodos: [], telefono: null, email: null, redes: {},
        },
      },
    };

    expect((mergePersonalApoyoDeputies(previous, refreshed) as typeof previous)["1009"].ficha).toMatchObject({
      comunas_distrito: "Santiago, Ñuñoa", numero_distrito: 10, region: "Región actualizada",
      partido: "Partido nuevo", bancada: "Bancada anterior", periodos: ["2022-2026", "2026-2030"],
      telefono: "+56 2 1234", email: "diputado@camara.cl", redes: { x: "https://x.com/diputado" },
      perfil_fuente: "https://www.camara.cl/perfil/1009",
    });
  });

  it("conserva cada categoría de transparencia cuando la consulta nueva no se pudo verificar", () => {
    const previous = {
      "1009": {
        transparencia_camara: {
          asesorias_externas: { status: "available", period: "septiembre 2026", rows: [{ values: { Asesor: "Asesora publicada" } }] },
          pasajes_aereos_nacionales: { status: "available", period: "septiembre 2026", rows: [{ values: { Destino: "Valparaíso" } }] },
        },
      },
    };
    const refreshed = {
      "1009": {
        transparencia_camara: {
          asesorias_externas: { status: "unknown", period: "octubre 2026", rows: [] },
          pasajes_aereos_nacionales: { status: "empty_confirmed", period: "octubre 2026", rows: [] },
        },
      },
    };

    const merged = mergePersonalApoyoDeputies(previous, refreshed) as Record<string, { transparencia_camara: Record<string, unknown> }>;
    expect(merged["1009"].transparencia_camara).toMatchObject({
      asesorias_externas: previous["1009"].transparencia_camara.asesorias_externas,
      pasajes_aereos_nacionales: {
        status: "empty_confirmed",
        period: "octubre 2026",
        rows: [],
        periods: [
          { period: "septiembre 2026", status: "available", rows: [{ values: { Destino: "Valparaíso" } }] },
          { period: "octubre 2026", status: "empty_confirmed", rows: [] },
        ],
      },
    });
  });

  it("incorpora todos los meses verificados del candidato sin reemplazarlos por el corte más reciente", () => {
    const merged = mergePersonalApoyoDeputies({
      "1009": {
        transparencia_camara: {
          asesorias_externas: {
            status: "available",
            period: "marzo 2026",
            rows: [{ values: { Asesor: "Registro marzo" } }],
          },
        },
      },
    }, {
      "1009": {
        transparencia_camara: {
          asesorias_externas: {
            status: "available",
            period: "mayo 2026",
            rows: [{ values: { Asesor: "Registro mayo" } }],
            periods: [
              { period: "abril 2026", status: "available", rows: [{ values: { Asesor: "Registro abril" } }] },
              { period: "mayo 2026", status: "available", rows: [{ values: { Asesor: "Registro mayo" } }] },
            ],
          },
        },
      },
    }) as Record<string, { transparencia_camara: Record<string, { periods: { period: string }[] }> }>;

    expect(merged["1009"].transparencia_camara.asesorias_externas.periods.map(({ period }) => period))
      .toEqual(["marzo 2026", "abril 2026", "mayo 2026"]);
  });

  it("rechaza una página de bloqueo antes de publicar datos", () => {
    expect(() => assertUsableOfficialHtml("<html>Attention Required! | Cloudflare</html>", "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_BLOCKED");
    expect(() => assertUsableOfficialHtml('<html><title>Just a moment...</title><div id="cf-chl-widget">challenge-platform</div></html>', "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_BLOCKED");
    expect(() => assertUsableOfficialHtml("<html>ok</html>", "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_EMPTY");
    expect(assertUsableOfficialHtml("<html>" + "x".repeat(300) + "</html>", "camara")).toContain("xxx");
  });

  it("rechaza el HTTP 403 aunque su HTML no contenga marcas de Cloudflare", () => {
    const genericPage = "<html><title>Forbidden</title>" + "x".repeat(300) + "</html>";
    expect(() => assertUsableOfficialResponse(genericPage, 403, "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_BLOCKED");
    expect(() => assertUsableOfficialResponse(genericPage, 404, "camara"))
      .toThrow("PERSONAL_APOYO_SOURCE_HTTP_404");
    expect(assertUsableOfficialResponse("<html>" + "x".repeat(300) + "</html>", 200, "camara")).toContain("xxx");
    const etl = readFileSync(resolve("scripts/etl-personal-apoyo.mjs"), "utf8");
    expect(etl).toContain("%{http_code}");
    expect(etl).toContain("assertUsableOfficialResponse(output.slice(0, status.index)");
  });

  it("identifica el bloqueo de Cámara para detener la ficha principal y omitir sólo la categoría afectada", () => {
    const blocked = new Error("PERSONAL_APOYO_SOURCE_BLOCKED: camara");
    expect(isCamaraAccessBlock(blocked)).toBe(true);
    expect(isCamaraAccessBlock(new Error("timeout"))).toBe(false);
    const etl = readFileSync(resolve("scripts/etl-personal-apoyo.mjs"), "utf8");
    expect(etl).toContain("blockedTransparencyCategories.has(category)");
    expect(etl).toContain("blockedTransparencyCategories.add(category)");
    expect(etl).toContain("if (isCamaraAccessBlock(e)) throw e");
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
    expect(personalWorkflow).not.toContain("schedule:");
    expect(personalWorkflow).toContain("verify_release_only:");
  });
});
