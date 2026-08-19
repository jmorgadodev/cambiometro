import { describe, expect, it } from "vitest";
import type { CanonicalEntity } from "./data-contracts";
import type { PersonalApoyoDataset } from "./personal-apoyo";
import { personalApoyoEvidenceRecords } from "./personal-apoyo";

const entity: CanonicalEntity = {
  id: "person-camara-1002",
  kind: "person",
  name: "Leonardo Soto Ferrada",
  identifiers: [{
    scheme: "camara-dipid",
    value: "1002",
    isPublic: true,
    sourceUrl: "https://opendata.camara.cl/",
  }],
  attributes: {},
  sourceIds: ["camara"],
  updatedAt: "2026-08-14",
};

const dataset = {
  generado_en: "2026-08-14T12:00:00.000Z",
  fuentes: {
    camara: {
      url: "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}",
      nota: "Fuente oficial",
    },
  },
  meses_senado_disponibles: [],
  diputados: {
    "1002": {
      meses: [{ num: "3", nombre: "marzo" }],
      mes_personal: "marzo 2026",
      ficha: {
        comunas_distrito: null,
        numero_distrito: 14,
        region: "Region Metropolitana",
        periodo: "2022-2026",
        partido: "Partido Socialista",
        bancada: "Socialista",
        foto: null,
        redes: {},
      },
      personal_apoyo: [{
        tipo: "Contrato",
        nombre: "LEAL MANDIOLA JUAN ANTONIO",
        cargo: "Asesor",
        sueldo: 449171,
        cese: "10/03/26",
      }],
    },
  },
  senadores: {},
} satisfies PersonalApoyoDataset;

describe("personal de apoyo en la ficha canonica", () => {
  it("convierte la fila oficial historica en un contrato visible y trazable", () => {
    expect(personalApoyoEvidenceRecords(entity, dataset)).toEqual([
      expect.objectContaining({
        kind: "contract",
        sourceId: "personal-apoyo",
        title: "LEAL MANDIOLA JUAN ANTONIO",
        occurredAt: "2026-03-01",
        subjectEntityIds: ["person-camara-1002"],
        amount: expect.objectContaining({ amountClp: 449171, currency: "CLP" }),
        evidence: expect.objectContaining({
          sourceUrl: "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1002",
        }),
        data: expect.objectContaining({ cese: "10/03/26", cargo: "Asesor" }),
      }),
    ]);
  });

  it("no atribuye personal cuando la entidad no tiene identificador oficial de Camara", () => {
    expect(personalApoyoEvidenceRecords({ ...entity, id: "person-otro", identifiers: [] }, dataset)).toEqual([]);
  });
});
