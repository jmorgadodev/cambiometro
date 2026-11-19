import { describe, expect, it } from "vitest";
import { mergePersonalApoyoDeputies, shouldPublishPersonalApoyoCandidate } from "../scripts/etl/personal-apoyo-publication.mjs";
import { reviewPersonalApoyoCandidate } from "../scripts/prepare-personal-apoyo-candidate.mjs";

const minimums = { diputados: 1, filasCamara: 1, oficinasSenado: 1, filasSenado: 1 };
function baseline() {
  const senadores: Record<string, { nombre: string; periodo: string; monto: number }[]> = { "Oficina A": [{ nombre: "Apoyo Senado", periodo: "2026-08", monto: 100 }, { nombre: "Apoyo Senado", periodo: "2026-09", monto: 200 }] };
  return {
    generado_en: "2026-11-18T00:00:00.000Z",
    diputados: { "1110": {
      mes_personal: "septiembre 2026", personal_apoyo: [{ nombre: "Apoyo", sueldo: null as number | null }],
      personal_apoyo_por_periodo: {
        "2026-08": { periodo: "agosto 2026", status: "available", rows: [{ nombre: "Apoyo agosto", sueldo: 100 }] },
        "2026-09": { periodo: "septiembre 2026", status: "available", rows: [{ nombre: "Apoyo", sueldo: null as number | null }] },
      },
      transparencia_camara: { asesorias_externas: { status: "available", periods: [
        { period: "septiembre 2026", status: "available", rows: [{ values: { Folio: "1", Monto: "100" } }] },
      ] } },
    } },
    senadores,
    meses_senado_disponibles: ["2026-08", "2026-09"],
  };
}
describe("conservación del historial de apoyo y asesorías", () => {
  it("retiene un candidato que pierde un mes de Senado aunque conserve el número total de filas", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.senadores["Oficina A"][0].periodo = "2026-09";
    expect(() => shouldPublishPersonalApoyoCandidate(current, candidate, minimums)).toThrow("PUBLISHED_HISTORY_LOSS");
  });
  it("retiene la pérdida de una oficina aunque las demás compensen sus filas", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.senadores = { "Otra oficina": candidate.senadores["Oficina A"] };
    expect(() => shouldPublishPersonalApoyoCandidate(current, candidate, minimums)).toThrow("PUBLISHED_HISTORY_LOSS");
  });
  it("retiene una pérdida de personal histórico Cámara sin cambiar el último mes", () => {
    const current = baseline(); const candidate = structuredClone(current);
    delete (candidate.diputados["1110"].personal_apoyo_por_periodo as Record<string, unknown>)["2026-08"];
    expect(() => shouldPublishPersonalApoyoCandidate(current, candidate, minimums)).toThrow("PUBLISHED_HISTORY_LOSS");
  });
  it("una lectura no publicada no sustituye el mismo mes que ya tenía contratos", () => {
    const current = baseline().diputados;
    const refreshed = { "1110": { mes_personal: "septiembre 2026", personal_apoyo: [], personal_apoyo_por_periodo: {
      "2026-09": { periodo: "septiembre 2026", status: "not_published", rows: [] },
    } } };
    const merged = (mergePersonalApoyoDeputies(current, refreshed) as typeof current)["1110"];
    expect(merged.personal_apoyo_por_periodo["2026-09"]).toEqual(current["1110"].personal_apoyo_por_periodo["2026-09"]);
    expect(merged.personal_apoyo).toEqual(current["1110"].personal_apoyo);
  });
  it("una observación parcial de asesorías no borra un mes ya publicado", () => {
    const current = baseline().diputados;
    const merged = (mergePersonalApoyoDeputies(current, { "1110": { transparencia_camara: { asesorias_externas: {
      status: "available", periods: [{ period: "septiembre 2026", status: "not_published", rows: [] }],
    } } } }) as typeof current)["1110"];
    expect(merged.transparencia_camara.asesorias_externas.periods).toEqual(current["1110"].transparencia_camara.asesorias_externas.periods);
  });
  it("mantiene distintos un importe desconocido y un cero explícito", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.diputados["1110"].personal_apoyo[0].sueldo = 0;
    candidate.diputados["1110"].personal_apoyo_por_periodo["2026-09"].rows[0].sueldo = 0;
    expect(() => shouldPublishPersonalApoyoCandidate(current, candidate, minimums)).toThrow("PUBLISHED_AMOUNTS_REVISED");
  });
  it("retiene la sustitución de una persona aun cuando no cambie el número de contratos", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.senadores["Oficina A"][0].nombre = "Otra persona";
    expect(() => shouldPublishPersonalApoyoCandidate(current, candidate, minimums)).toThrow("PUBLISHED_HISTORY_LOSS");
  });
  it("prepara un mes nuevo sin tocar el historial ni publicar", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.senadores["Oficina A"].push({ nombre: "Apoyo Senado", periodo: "2026-10", monto: 300 });
    const review = reviewPersonalApoyoCandidate(current, candidate, "senado-support", minimums);
    expect(review.status).toBe("prepared"); expect(review.automaticPublication).toBe(false);
    expect(review.additions).toEqual([{ kind: "senado-support", authority: "Oficina A", period: "2026-10", rows: 1 }]);
    expect(current.senadores["Oficina A"]).toHaveLength(2);
  });
  it("una revisión de importes publicados o de otra fuente exige revisión", () => {
    const current = baseline(); const candidate = structuredClone(current);
    candidate.senadores["Oficina A"][0].monto = 0;
    const review = reviewPersonalApoyoCandidate(current, candidate, "camara-advisories", minimums);
    expect(review.status).toBe("requires-review");
    expect(review.reasons).toContain("published-period-revised"); expect(review.reasons).toContain("another-source-changed");
  });
  it("no crea una actualización sólo por cambiar la fecha de extracción", () => {
    const current = baseline();
    expect(reviewPersonalApoyoCandidate(current, { ...current, generado_en: "2026-11-18T12:00:00.000Z" }, "senado-support", minimums).status).toBe("unchanged");
    expect(() => reviewPersonalApoyoCandidate(current, current, "desconocida", minimums)).toThrow("SOURCE_INVALID");
  });
});
