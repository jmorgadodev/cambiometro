import { test, expect } from "vitest";
import { buildParliamentarySalaryView } from "./remuneraciones-38bis-parliamentary.mjs";

const deputy = { partida: "Congreso Nacional", organismo: "Cámara", cargo: "DIPUTADO", nombre: "Ana Pérez", bruto_mensual: 9_000_000 };
const senator = { partida: "Congreso Nacional", organismo: "Senado", cargo: "SENADOR", nombre: "Juan Soto", bruto_mensual: 8_000_000 };

test("usa julio para la diputada publicada y junio para el senador no reportado en julio", () => {
  const current = { fuente: "38 bis", url: "https://example.org", mes: "2026-07", extraido_en: "2026-10-11", registros: [
    { ...deputy, bruto_mensual: 9_100_000 },
    { ...senator, nombre: "NO REPORTADO", bruto_mensual: null },
  ] };
  const history = { periodos: [{ mes: "2026-06", registros: [deputy, senator] }] };
  const result = buildParliamentarySalaryView(current, history, { expectedRows: 2 });
  expect(result.congreso.map((row) => [row.nombre, row.mes, row.bruto_mensual])).toEqual([
    ["Ana Pérez", "2026-07", 9_100_000],
    ["Juan Soto", "2026-06", 8_000_000],
  ]);
});

test("bloquea identidad nueva o ambigua, en vez de publicar una mezcla no comprobada", () => {
  const current = { mes: "2026-07", registros: [{ ...deputy, nombre: "Otra Persona" }] };
  const history = { periodos: [{ mes: "2026-06", registros: [deputy, senator] }] };
  expect(() => buildParliamentarySalaryView(current, history, { expectedRows: 2 })).toThrow(/38BIS_CONGRESS_IDENTITY_MISMATCH/);
});

test("bloquea el cambio de cámara de una fila con el mismo nombre", () => {
  const current = { mes: "2026-07", registros: [{ ...deputy, cargo: "SENADOR" }] };
  const history = { periodos: [{ mes: "2026-06", registros: [deputy, senator] }] };
  expect(() => buildParliamentarySalaryView(current, history, { expectedRows: 2 })).toThrow(/38BIS_CONGRESS_IDENTITY_MISMATCH/);
});
