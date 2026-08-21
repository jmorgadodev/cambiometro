import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  evaluateSenateSupport,
  parseSenadoAssignmentPolicy,
} from "../scripts/etl/senado-assignment.mjs";

const officialHtml = `
  <h1>Personal de Apoyo</h1>
  <p>La asignación mensual desde enero 2026 es de $ 11.406.149, monto no susceptible de ser acumulado.</p>
  <p>El Consejo Resolutivo permite que se traspase hasta el 40% de la Asignación de Gastos Operacionales.</p>
  <p>Permite además que se traspase, desde el 11 de marzo de 2026, hasta un monto de $ 1.230.467,
  desde la Asignación de Asesoría Externa.</p>
`;

describe("FIX-2 — asignación y transferencias de personal de apoyo Senado", () => {
  it("extrae la política vigente desde la página oficial", () => {
    expect(parseSenadoAssignmentPolicy(officialHtml)).toEqual({
      year: 2026,
      base_mensual_clp: 11_406_149,
      acumulable: false,
      max_transfer_gastos_operacionales_pct: 40,
      max_transfer_asesoria_externa_clp: 1_230_467,
      transfer_asesoria_desde: "2026-03-11",
    });
  });

  it("mantiene Kaiser julio como ALTA mientras no exista traspaso individual acreditado", () => {
    expect(evaluateSenateSupport({
      total_clp: 15_250_000,
      period: "2026-07",
      base_mensual_clp: 11_406_149,
      verified_transfers: [],
    })).toEqual(expect.objectContaining({
      status: "ALTA",
      excess_clp: 3_843_851,
      verified_transfer_clp: 0,
      unexplained_clp: 3_843_851,
    }));
  });

  it("acepta sólo transferencias individualizadas con URL y checksum", () => {
    const result = evaluateSenateSupport({
      total_clp: 15_250_000,
      period: "2026-07",
      base_mensual_clp: 11_406_149,
      verified_transfers: [
        {
          period: "2026-07",
          amount_clp: 3_843_851,
          source_url: "https://www.senado.cl/transparencia/evidencia",
          checksum_sha256: "a".repeat(64),
        },
      ],
    });
    expect(result.status).toBe("OK");
    expect(result.unexplained_clp).toBe(0);
  });

  it("no confunde la autorización general del 40% con evidencia de un traspaso", () => {
    const result = evaluateSenateSupport({
      total_clp: 17_500_000,
      period: "2026-07",
      base_mensual_clp: 11_406_149,
      verified_transfers: [],
    });
    expect(result.status).toBe("CRITICA");
    expect(result.verified_transfer_clp).toBe(0);
  });

  it("persiste la evidencia de política y presenta las diferencias como hallazgos", () => {
    const etl = fs.readFileSync("scripts/etl-personal-apoyo.mjs", "utf8");
    const component = fs.readFileSync("components/PersonalApoyoMensual.tsx", "utf8");
    expect(etl).toContain("checksum_sha256");
    expect(etl).toContain("asignacion_senado_2026");
    expect(etl).toContain("transferencias_acreditadas: []");
    expect(component).toContain("Hallazgo de integridad");
    expect(component).toContain("la diferencia se muestra como hallazgo y no como dato conciliado");
  });
});
