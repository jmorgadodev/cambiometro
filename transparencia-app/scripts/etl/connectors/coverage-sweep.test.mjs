import { describe, expect, it } from "vitest";
import { runCoverageSweep } from "../../coverage-sweep.mjs";

describe("coverage sweep labels for unmeasured universes", () => {
  it("does not report release counts as 100% source coverage", async () => {
    const { rows } = await runCoverageSweep({
      silent: true,
      transferManifest: { totalRows: 62_172, expected: { totalMontoClp: 5_319_347_544_762 } },
      infolobbyCount: 71_467,
      contraloriaCount: 528,
    });

    const transfer = rows.find(({ modulo }) => modulo.includes("Transferencias Ley 19.862"));
    expect(transfer.cobertura).toBe("No medida");
    expect(transfer.estado).toBe("CHECKED");

    for (const name of ["InfoLobby Audiencias", "ChileCompra", "Contraloría General (CGR)"]) {
      const row = rows.find(({ modulo }) => modulo.includes(name));
      expect(row, `row for ${name}`).toBeDefined();
      expect(row.cobertura, name).toBe("No medida");
      expect(row.estado, name).toBe("NO MEDIDA");
    }
  });

  it("labels snapshot-derived counts as checks rather than official coverage", async () => {
    const { rows } = await runCoverageSweep({ silent: true });
    const voting = rows.find(({ modulo }) => modulo === "Votaciones Sala Período 2026-2030");
    const staff = rows.find(({ modulo }) => modulo.startsWith("Personal Apoyo Cámara"));
    expect(voting.cobertura).toBe("No medida");
    expect(staff.cobertura).toBe("No medida");
  });
});
