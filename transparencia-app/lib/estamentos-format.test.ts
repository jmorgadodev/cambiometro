import { describe, expect, it } from "vitest";
import { formatEstamentoCorto, formatTipoContrato, getInitials } from "./estamentos-format";

describe("estamentos-format", () => {
  it("mapea nombres excesivamente largos a versiones cortas", () => {
    const saludLarga = "MÉDICOS CIRUJANOS FARMACÉUTICOS QUÍMICOFARMACÉUTICOS BIOQUÍMICOS CIRUJANOODENTISTAS";
    const res = formatEstamentoCorto(saludLarga);
    expect(res.label).toBe("Médicos y Salud");
    expect(res.original).toBe(saludLarga);
    expect(res.text).toBe("#10b981");
  });

  it("mapea tecnicos de nivel superior", () => {
    const res = formatEstamentoCorto("TÉCNICOS DE NIVEL SUPERIOR (LEY 19.378)");
    expect(res.label).toBe("Técnico Nivel Superior");
  });

  it("trunca con elipsis categorias no mapeadas que exceden 26 caracteres", () => {
    const res = formatEstamentoCorto("CATEGORIA DESCONOCIDA EXTRAORDINARIAMENTE LARGA Y COMPLEJA");
    expect(res.label.length).toBeLessThanOrEqual(26);
    expect(res.label.endsWith("…")).toBe(true);
  });

  it("extrae iniciales correctamente", () => {
    expect(getInitials("Claudio Andres Adaros Gonzalez")).toBe("CG");
    expect(getInitials("Daniel Aguilar")).toBe("DA");
    expect(getInitials("Mario")).toBe("MA");
    expect(getInitials("")).toBe("FP");
  });

  it("formatea tipos de contrato", () => {
    expect(formatTipoContrato("Personal a Contrata").label).toBe("Contrata");
    expect(formatTipoContrato("Planta").label).toBe("Planta");
    expect(formatTipoContrato("Honorarios").label).toBe("Honorarios");
    expect(formatTipoContrato("Codigo del Trabajo").label).toBe("Cód. Trabajo");
  });
});
