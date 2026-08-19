import { describe, expect, it } from "vitest";
import {
  expenseRowToEtlRecord,
  lobbyRowToEtlRecord,
  politicoCanonicalEntityIds,
  type CanonicalPoliticoRecordRow,
} from "./politico-canonical";

describe("datos canónicos de una ficha política", () => {
  it("usa el identificador oficial de Cámara para evitar coincidencias ambiguas", () => {
    expect(politicoCanonicalEntityIds({
      cargo: "Diputado",
      nombreCompleto: "José Antonio Kast Adriasola",
      camaraId: "1218",
    }, [])).toEqual(["person-camara-1218"]);
  });

  it("resuelve las entidades senatoriales por nombre oficial normalizado", () => {
    expect(politicoCanonicalEntityIds({
      cargo: "Senador",
      nombreCompleto: "Carlos Kuschel Silva",
      camaraId: null,
    }, [
      { id: "senator-cl-ue-34", name: "CARLOS KUSCHEL SILVA" },
      { id: "senator-cl-ue-35", name: "Otra Persona" },
    ])).toEqual(["senator-cl-ue-34"]);
  });

  it("convierte un gasto D1 conservando monto, período y evidencia oficial", () => {
    const row: CanonicalPoliticoRecordRow = {
      id: "gastos_camara-1218-2026-07-arriendo",
      source_id: "gastos_camara",
      kind: "expense",
      title: "Arriendo",
      description: null,
      occurred_at: "2026-07-01",
      period_json: '{"label":"2026-07"}',
      subject_entity_ids_json: '["person-camara-1218"]',
      object_entity_ids_json: '["public-body-camara"]',
      amount_json: '{"value":250000,"currency":"CLP","unit":"pesos"}',
      evidence_json: '{"sourceUrl":"https://www.camara.cl/fuente"}',
      data_json: '{"diputado_id":"1218","item":"ARRIENDO","nombre":"José Antonio Kast Adriasola","periodo":"2026-07"}',
    };

    expect(expenseRowToEtlRecord(row)).toMatchObject({
      id: row.id,
      item: "ARRIENDO",
      periodo: "2026-07",
      monto_clp: 250000,
      url: "https://www.camara.cl/fuente",
      fuente: "gastos_camara",
    });
  });

  it("proyecta una audiencia D1 con sujeto activo, materia y fuente", () => {
    const row: CanonicalPoliticoRecordRow = {
      id: "audiencia-1",
      source_id: "infolobby",
      kind: "lobby",
      title: "Audiencia",
      description: null,
      occurred_at: "2026-07-02",
      period_json: '{"label":"2026-07"}',
      subject_entity_ids_json: '["person-infolobby-p-1"]',
      object_entity_ids_json: "[]",
      amount_json: null,
      evidence_json: '{"sourceUrl":"https://www.infolobby.cl/audiencia/1"}',
      data_json: '{"lobby_event_kind":"audience","organismo":"Servicio oficial","detalle":[{"materia":"Regulación pública"}],"sujetos_activos":[{"activo":"Representante Uno"}]}',
    };

    expect(lobbyRowToEtlRecord(row)).toMatchObject({
      id: "audiencia-1",
      fecha: "2026-07-02",
      lobby_event_kind: "audience",
      organismo: "Servicio oficial",
      materia: "Regulación pública",
      sujetos_activos: "Representante Uno",
      url: "https://www.infolobby.cl/audiencia/1",
    });
  });
});
