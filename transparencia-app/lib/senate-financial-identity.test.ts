import { describe, expect, it } from "vitest";
import { buildMemberSupport } from "./party-support";
import { POLITICOS_SEED } from "./politicos-source";
import type { PersonalApoyoDataset } from "./personal-apoyo";

const paulina = {
  id: "sen-030",
  cargo: "Senador",
  nombre_completo: "Paulina Vodanovic Rojas",
  deputyId: null,
};
const becker = {
  id: "sen-test",
  cargo: "Senador",
  nombre_completo: "Miguel Ángel Becker Alvear",
  deputyId: null,
};
function dataset(
  offices: Record<string, { periodo: string; monto: number }[]>,
): PersonalApoyoDataset {
  return {
    generado_en: "2026-11-21",
    fuentes: {},
    meses_senado_disponibles: [],
    diputados: {},
    senadores: offices,
  } as unknown as PersonalApoyoDataset;
}
const row = (periodo = "2026-04", monto = 120) => ({ periodo, monto });

describe("deterministic Senate financial identity association", () => {
  it("does not let an unverified rival with a partial surname claim the verified office", () => {
    const rival = {
      id: "sen-rival",
      cargo: "Senador",
      nombre_completo: "Paula Vodanovic López",
      deputyId: null,
    };
    const result = buildMemberSupport(
      [paulina, rival],
      dataset({ "VODANOVIC PAULINA": [row()] }),
    );
    expect(result[paulina.id]["2026-04"]).toEqual({
      amount: 120,
      contracts: 1,
    });
    expect(result[rival.id]).toEqual({});
  });

  it("preserves all 49 other current senators on complete synthetic office observations", () => {
    const others = POLITICOS_SEED.filter(
      (p) => p.cargo === "Senador" && p.id !== "sen-030",
    ).map((p) => ({ ...p, deputyId: null }));
    expect(others).toHaveLength(49);
    const offices = Object.fromEntries(
      others.map((p, i) => [
        p.nombre_completo,
        [row("2026-04", 1000 + i), row("2026-05", 2000 + i)],
      ]),
    );
    const result = buildMemberSupport(
      [...others, paulina],
      dataset({ ...offices, "VODANOVIC PAULINA": [row()] }),
    );
    for (const [i, member] of others.entries())
      expect(result[member.id]).toEqual({
        "2026-04": { amount: 1000 + i, contracts: 1 },
        "2026-05": { amount: 2000 + i, contracts: 1 },
      });
  });

  it("recovers the verified abbreviated office for canonical sen-030", () => {
    const source = dataset({ "VODANOVIC PAULINA": [row()] });
    expect(
      buildMemberSupport([paulina], source)[paulina.id]["2026-04"],
    ).toEqual({ amount: 120, contracts: 1 });
    expect(Object.keys(source.senadores)).toEqual(["VODANOVIC PAULINA"]);
  });

  it.each([
    "Vodanovic, Paulina",
    "PAULINA VODANOVIC",
    "  Vodánovic . Paulina  ",
  ])(
    "accepts orthographic and order variants of the explicit verified alias: %s",
    (office) => {
      expect(
        buildMemberSupport([paulina], dataset({ [office]: [row()] }))[
          paulina.id
        ]["2026-04"]?.amount,
      ).toBe(120);
    },
  );

  it("does not infer an abbreviated identity for another canonical ID", () => {
    const other = { ...paulina, id: "sen-unverified" };
    expect(
      buildMemberSupport([other], dataset({ "VODANOVIC PAULINA": [row()] }))[
        other.id
      ],
    ).toEqual({});
  });

  it("does not transfer the alias if the canonical catalog name no longer matches", () => {
    const other = { ...paulina, nombre_completo: "Paulina Núñez Urrutia" };
    expect(
      buildMemberSupport([other], dataset({ "VODANOVIC PAULINA": [row()] }))[
        other.id
      ],
    ).toEqual({});
  });

  it("retains exact full-name matching regardless of order, accents and punctuation", () => {
    const d = dataset({ "BECKER, ALVEAR . MIGUEL ANGEL": [row()] });
    expect(buildMemberSupport([becker], d)[becker.id]["2026-04"]).toEqual({
      amount: 120,
      contracts: 1,
    });
  });

  it("does not attribute the historical CASTRO PRIETO JUAN office to Juan Luis Castro González", () => {
    const current = {
      id: "sen-025",
      cargo: "Senador",
      nombre_completo: "Juan Luis Castro González",
      deputyId: null,
    };
    expect(
      buildMemberSupport([current], dataset({ "CASTRO PRIETO JUAN": [row()] }))[
        current.id
      ],
    ).toEqual({});
  });

  it("rejects an unverified partial surname match", () => {
    expect(
      buildMemberSupport([becker], dataset({ "MIGUEL BECKER": [row()] }))[
        becker.id
      ],
    ).toEqual({});
  });

  it("rejects ambiguous offices instead of choosing one or adding both", () => {
    const d = dataset({
      "VODANOVIC PAULINA": [row()],
      "PAULINA VODANOVIC": [row()],
    });
    expect(buildMemberSupport([paulina], d)[paulina.id]).toEqual({});
  });

  it("rejects an office claimed by two canonical catalog entries", () => {
    const d = dataset({ "BECKER ALVEAR MIGUEL ANGEL": [row()] });
    const duplicate = { ...becker, id: "sen-duplicate" };
    const index = buildMemberSupport([becker, duplicate], d);
    expect(index[becker.id]).toEqual({});
    expect(index[duplicate.id]).toEqual({});
  });

  it("keeps all source observations and month boundaries without double counting", () => {
    // Synthetic amounts: only multiplicities reproduce the documented source coverage.
    const counts: Record<string, number> = {
      "2026-01": 3,
      "2026-02": 7,
      "2026-03": 9,
      "2026-04": 9,
      "2026-05": 8,
      "2026-06": 8,
      "2026-07": 9,
      "2026-08": 10,
      "2026-09": 10,
    };
    const rows = Object.entries(counts).flatMap(([period, count]) =>
      Array.from({ length: count }, () => row(period, 100)),
    );
    expect(rows).toHaveLength(73);
    const d = dataset({ "VODANOVIC PAULINA": rows });
    const scope = buildMemberSupport([paulina], d)[paulina.id];
    expect(Object.values(scope).reduce((s, x) => s + x.contracts, 0)).toBe(63);
    expect(Object.values(scope).reduce((s, x) => s + (x.amount ?? 0), 0)).toBe(
      6300,
    );
    expect(scope["2026-01"]).toBeUndefined();
    for (const [period, count] of Object.entries(counts).filter(
      ([period]) => period >= "2026-03",
    ))
      expect(scope[period]).toEqual({ amount: count * 100, contracts: count });
    expect(
      Object.values(
        buildMemberSupport([paulina], d, "2026-01")[paulina.id],
      ).reduce((s, x) => s + x.contracts, 0),
    ).toBe(73);
  });

  it("applies the same verified identity to subsequent months without a monthly alias patch", () => {
    const source = dataset({ "VODANOVIC PAULINA": [row("2026-09", 120)] });
    source.senadores["VODANOVIC PAULINA"].push(row("2026-10", 150) as never);
    const index = buildMemberSupport([paulina], source)[paulina.id];
    expect(index["2026-09"]).toEqual({ amount: 120, contracts: 1 });
    expect(index["2026-10"]).toEqual({ amount: 150, contracts: 1 });
  });
});
