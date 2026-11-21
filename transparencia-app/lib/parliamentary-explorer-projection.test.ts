import { describe, expect, it } from "vitest";
import {
  aggregateExplorerRecords,
  normalizeExplorerRole,
  normalizeExplorerRegion,
} from "./parliamentary-explorer-projection";
import {
  explorerCsv,
  explorerComponentAvailability,
  explorerGroupCsv,
  explorerDefaults,
  explorerParams,
  explorerQueryFromParams,
  packExplorer,
  unpackExplorer,
  type ExplorerData,
  type ExplorerRecord,
} from "./parliamentary-explorer";
const record = (extra: Partial<ExplorerRecord> = {}): ExplorerRecord => ({
  id: "record-1",
  memberId: "d",
  period: "2026-04",
  component: "personal",
  category: "Personal de apoyo",
  item: "Nómina mensual",
  role: "asistente",
  amount: 100,
  recordCount: 1,
  sourceScope: "institutional",
  sourceLabel: "Cámara",
  releaseId: "release",
  ...extra,
});
const base: ExplorerData = {
  schemaVersion: 1,
  releaseId: "release",
  members: [
    {
      id: "d",
      name: "Ana Pérez Soto",
      chamber: "camara",
      regionId: "biobio",
      regionLabel: "Biobío",
      district: "20",
      profileUrl: "/politico/d",
    },
  ],
  facts: [],
  partitions: [],
  sources: {},
  notes: [],
};
describe("proyección del explorador", () => {
  it("conserva registros homónimos en meses/equipos y no inventa identidades", () => {
    const facts = aggregateExplorerRecords([
      record(),
      record({ id: "record-2" }),
      record({ period: "2026-05" }),
    ]);
    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({ amount: 200, recordCount: 2 });
    expect(facts[0]).not.toHaveProperty("personId");
  });
  it("conserva ausencia frente a cero al agregar", () => {
    expect(
      aggregateExplorerRecords([record({ amount: null })])[0].amount,
    ).toBeNull();
    expect(aggregateExplorerRecords([record({ amount: 0 })])[0].amount).toBe(0);
  });
  it("normaliza territorio y sólo variaciones ortográficas del cargo", () => {
    expect(normalizeExplorerRegion("Región del Biobío")).toMatchObject({
      regionId: "biobio",
      regionLabel: "Biobío",
    });
    expect(normalizeExplorerRegion("Región del Bío Bío")).toMatchObject({
      regionId: "biobio",
      regionLabel: "Biobío",
    });
    expect(normalizeExplorerRole("  ASISTENTE   Parlamentario ")).toBe(
      "asistente parlamentario",
    );
    expect(normalizeExplorerRole("Secretaria")).not.toBe(
      normalizeExplorerRole("Asistente"),
    );
  });
  it("comprime sin perder importes, roles, ceros o referencias", () => {
    const data = {
      ...base,
      facts: aggregateExplorerRecords([
        record(),
        record({ role: undefined, amount: 0 }),
      ]),
    };
    expect(unpackExplorer(packExplorer(data))).toEqual(data);
  });
  it("restaura URL antigua y conserva contexto y participantes nuevos", () => {
    const data = { ...base, facts: aggregateExplorerRecords([record()]) };
    const q = {
      ...explorerDefaults(data),
      view: "comparar" as const,
      regionIds: ["biobio"],
      compareIds: ["d"],
      componentIds: ["personal" as const],
      component: "personal",
      metricComponent: "personal" as const,
    };
    expect(explorerQueryFromParams(explorerParams(q), data)).toMatchObject(q);
    expect(
      explorerQueryFromParams(
        new URLSearchParams("parlamentario=d&componente=personal"),
        data,
      ),
    ).toMatchObject({ memberIds: ["d"], componentIds: ["personal"] });
  });
  it("exporta ausencia vacía, fuente y protección ante fórmulas", () => {
    const csv = explorerCsv(base, [
      record({
        item: "=HYPERLINK()",
        amount: null,
        sourceSnapshotAt: "2026-11-18T00:00:00Z",
        sourceUrl: "https://www.camara.cl/",
      }),
    ]);
    expect(csv).toContain("'=HYPERLINK()");
    expect(csv).toContain("Sin información");
    expect(csv).toContain("https://www.camara.cl/");
    const columns = csv.split("\r\n").map((line) => line.split(";").length);
    expect(columns[0]).toBe(columns[1]);
  });
  it("distinguishes excluded components and inapplicable categories from missing publication", () => {
    const data = { ...base, facts: aggregateExplorerRecords([record()]) };
    const q = explorerDefaults(data);
    expect(
      explorerComponentAvailability(
        data,
        { ...q, componentIds: ["gastos"] },
        "personal",
        null,
      ),
    ).toBe("filtered");
    expect(
      explorerComponentAvailability(
        data,
        { ...q, category: "Personal de apoyo" },
        "gastos",
        null,
      ),
    ).toBe("not-applicable");
    expect(explorerComponentAvailability(data, q, "gastos", null)).toBe(
      "missing",
    );
    expect(explorerComponentAvailability(data, q, "personal", 0)).toBe(
      "available",
    );
  });
  it("exports analytical groups with the same measure and full result as the ranking", () => {
    const data = {
      ...base,
      facts: aggregateExplorerRecords([record(), record({ id: "other" })]),
    };
    const q = {
      ...explorerDefaults(data),
      metricComponent: "personal" as const,
    };
    const csv = explorerGroupCsv(data, q);
    expect(csv).toContain(";200;");
    expect(csv).toContain("Personal de apoyo");
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
