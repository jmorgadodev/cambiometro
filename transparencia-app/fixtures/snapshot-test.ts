/**
 * Snapshot determinista exclusivo de Vitest.
 *
 * El lago real no se versiona: en produccion las consultas canonicas salen de
 * D1/R2. Este fixture mantiene las pruebas unitarias aisladas del estado local.
 */
const authoritySource =
  "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes";

const authorities = [
  {
    id: "843",
    nombre: "René Manuel García García",
    distrito: null,
    cargo: "Diputado/a — Cámara de Diputadas y Diputados",
    url: authoritySource,
    fuente: "Congreso Nacional · OpenData",
  },
  ...Array.from({ length: 154 }, (_, index) => ({
    id: `fixture-${index + 1}`,
    nombre: `Autoridad Fixture ${index + 1}`,
    distrito: null,
    cargo: "Diputado/a — Cámara de Diputadas y Diputados",
    url: authoritySource,
    fuente: "Congreso Nacional · OpenData",
  })),
];

const snapshot = {
  generado_por: "fixtures/snapshot-test.ts",
  actualizado_en: "2026-08-12T00:00:00.000Z",
  fuentes: {
    congreso_opendata: authorities,
    votaciones_camara: [
      {
        id: "vot-fixture-1",
        votacion_id: "fixture-1",
        descripcion: "Votación de integración",
        fecha: "2026-08-11",
        resultado: "Aprobado",
        quorum: "Quórum Simple",
        tipo: "Proyecto de Ley",
        url: "https://opendata.camara.cl/",
        votos: [
          { id: "843", nombre: "René Manuel García García", opcion_valor: "1", opcion: "Afirmativo" },
          { id: "fixture-1", nombre: "Autoridad Fixture 1", opcion_valor: "0", opcion: "En Contra" },
          { id: "fixture-2", nombre: "Autoridad Fixture 2", opcion_valor: "2", opcion: "Abstención" },
        ],
      },
    ],
    infoprobidad: [],
    infolobby: [],
  },
};

export function leerSnapshot() {
  return snapshot;
}
