import { describe, expect, it } from "vitest";
import { chileExpenseSchedule, mergeExpenseRecords, pagesRefreshWorkflowDispatchArgs, resolveNpmCliPath } from "./etl-expenses-local.mjs";

describe("runner local de gastos operacionales", () => {
  it("ejecuta el día 2 usando la zona horaria de Chile", () => {
    const schedule = chileExpenseSchedule(new Date("2026-08-02T03:30:00.000Z"));
    expect(schedule.date).toBe("2026-08-01");
    expect(schedule.shouldRun).toBe(false);

    const second = chileExpenseSchedule(new Date("2026-08-02T04:30:00.000Z"));
    expect(second.date).toBe("2026-08-02");
    expect(second.shouldRun).toBe(true);
  });

  it("fusiona por ID sin duplicar ni reducir el snapshot anterior", () => {
    const merged = mergeExpenseRecords(
      [{ id: "a", monto_clp: 100 }, { id: "b", monto_clp: 200 }],
      [{ id: "b", monto_clp: 250 }, { id: "c", monto_clp: 300 }],
    );
    expect(merged).toEqual([
      { id: "a", monto_clp: 100 },
      { id: "b", monto_clp: 250 },
      { id: "c", monto_clp: 300 },
    ]);
  });

  it("solicita un data-refresh confirmado que también publique Pages", () => {
    expect(pagesRefreshWorkflowDispatchArgs()).toEqual([
      "workflow",
      "run",
      "Pages estático - refresco automático verificable",
      "--ref",
      "main",
      "-f",
      "deployment_mode=data-refresh",
      "-f",
      "confirm_data_refresh=CAMBIOMETRO_DATA_REFRESH",
      "-f",
      "publish_pages=true",
      "-f",
      "confirm_cutover=CAMBIOMETRO_CONFIRM_CUTOVER",
    ]);
  });

  it("usa npm_execpath cuando la instalación local de npm no existe en Windows", () => {
    const npmPath = resolveNpmCliPath({
      localNpmCli: "C:/repo/node_modules/npm/bin/npm-cli.js",
      npmExecPath: "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js",
      isFile: (path) => path.startsWith("C:/Program Files/"),
    });
    expect(npmPath).toBe("C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js");
  });
});
