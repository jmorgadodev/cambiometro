import { describe, expect, it } from "vitest";
import {
  explorerDefaults,
  explorerMetrics,
  filterExplorerFacts,
  type ExplorerData,
} from "./parliamentary-explorer";

const data: ExplorerData = {
  schemaVersion: 1,
  releaseId: "verified-release",
  members: [
    {
      id: "d1",
      name: "Ana Pérez Soto",
      chamber: "camara",
      partyId: "a",
      partyLabel: "Partido A",
      regionId: "biobio",
      regionLabel: "Biobío",
      district: "20",
      profileUrl: "/politico/d1",
    },
    {
      id: "d2",
      name: "Luis Díaz Rojas",
      chamber: "camara",
      partyId: "b",
      partyLabel: "Partido B",
      regionId: "maule",
      regionLabel: "Maule",
      district: "17",
      profileUrl: "/politico/d2",
    },
    {
      id: "s1",
      name: "Eva Soto Ríos",
      chamber: "senado",
      partyId: "a",
      partyLabel: "Partido A",
      regionId: "biobio",
      regionLabel: "Biobío",
      district: null,
      profileUrl: "/politico/s1",
    },
  ],
  facts: [
    {
      memberId: "d1",
      period: "2026-03",
      component: "gastos",
      category: "Oficinas",
      item: "Arriendo",
      amount: 100,
      recordCount: 1,
    },
    {
      memberId: "d1",
      period: "2026-04",
      component: "gastos",
      category: "Traslados",
      item: "Pasajes",
      amount: 200,
      recordCount: 2,
    },
    {
      memberId: "d2",
      period: "2026-04",
      component: "gastos",
      category: "Traslados",
      item: "Pasajes",
      amount: 300,
      recordCount: 1,
    },
    {
      memberId: "d2",
      period: "2026-04",
      component: "personal",
      category: "Personal de apoyo",
      item: "Nómina",
      role: "Asistencia",
      amount: 500,
      recordCount: 2,
    },
    {
      memberId: "s1",
      period: "2026-04",
      component: "gastos",
      category: "Traslados",
      item: "Pasajes",
      amount: 0,
      recordCount: 1,
    },
    {
      memberId: "s1",
      period: "2026-04",
      component: "personal",
      category: "Personal de apoyo",
      item: "Nómina",
      role: "Asistencia",
      amount: null,
      recordCount: 1,
    },
  ],
  partitions: [],
  sources: {},
  notes: [],
};

describe("un único universo filtrado para medidas y visualizaciones", () => {
  it("aplica cámara, período, componente y categoría también a los indicadores", () => {
    const query = {
      ...explorerDefaults(data),
      chamber: "camara",
      from: "2026-04",
      to: "2026-04",
      component: "gastos",
      componentIds: ["gastos" as const],
      category: "Traslados",
    };
    const rows = filterExplorerFacts(data, query);
    const metrics = explorerMetrics(data, query);
    expect(rows).toHaveLength(2);
    expect(metrics.components.gastos).toMatchObject({
      amount: 500,
      records: 3,
    });
    expect(metrics.components.gastos.amount).toBe(
      rows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    );
    expect(metrics.components.personal.amount).toBeNull();
    expect(metrics.records).toBe(3);
  });

  it("conserva el mismo ámbito territorial y partidario en filas y medidas", () => {
    const query = {
      ...explorerDefaults(data),
      regionIds: ["biobio"],
      partyIds: ["a"],
      component: "gastos",
      componentIds: ["gastos" as const],
    };
    const rows = filterExplorerFacts(data, query);
    const metrics = explorerMetrics(data, query);
    expect(rows.map((row) => row.memberId)).toEqual(["d1", "d1", "s1"]);
    expect(metrics.components.gastos).toMatchObject({
      amount: 300,
      records: 4,
    });
    expect(metrics.records).toBe(
      rows.reduce((sum, row) => sum + row.recordCount, 0),
    );
  });

  it("distingue un cero publicado de un importe ausente sin inventar personas", () => {
    const base = {
      ...explorerDefaults(data),
      memberIds: ["s1"],
      member: "todos",
      from: "2026-04",
      to: "2026-04",
    };
    const zero = explorerMetrics(data, {
      ...base,
      component: "gastos",
      componentIds: ["gastos"],
    });
    const missing = explorerMetrics(data, {
      ...base,
      component: "personal",
      componentIds: ["personal"],
    });
    expect(zero.components.gastos).toMatchObject({ amount: 0, records: 1 });
    expect(missing.components.personal).toMatchObject({
      amount: null,
      records: 1,
    });
    expect(missing).not.toHaveProperty("uniquePeople");
    expect(missing).not.toHaveProperty("total");
  });

  it("no convierte observaciones mensuales repetidas en equipos adicionales", () => {
    const query = {
      ...explorerDefaults(data),
      memberIds: ["d1"],
      member: "todos",
      component: "gastos",
      componentIds: ["gastos" as const],
    };
    const metrics = explorerMetrics(data, query);
    expect(metrics.components.gastos).toMatchObject({
      amount: 300,
      records: 3,
    });
    expect(metrics.members).toBe(1);
  });
});
