import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { infoLobbyDefaultFrom, infolobbyRunOutputs } from "./etl/infolobby-run-state.mjs";

const workflow = readFileSync(new URL("../../.github/workflows/etl-infolobby-scheduled.yml", import.meta.url), "utf8");
const ingestScript = readFileSync(new URL("./ingest-infolobby.mjs", import.meta.url), "utf8");

describe("workflow ETL de InfoLobby", () => {
  it("usa el inicio del trimestre anterior como ventana mínima de relectura", () => {
    expect(infoLobbyDefaultFrom(new Date("2026-10-10T00:00:00.000Z"))).toBe("2026-07-01");
    expect(infoLobbyDefaultFrom(new Date("2026-02-10T00:00:00.000Z"))).toBe("2025-10-01");
    expect(infoLobbyDefaultFrom(new Date("2026-08-10T00:00:00.000Z"))).toBe("2026-04-01");
  });

  it("trata un rango vacío como no publicable", () => {
    expect(infolobbyRunOutputs(0)).toEqual({ hasRecords: false, recordCount: "0" });
  });

  it("habilita publicación sólo cuando hay registros nuevos", () => {
    expect(infolobbyRunOutputs(12)).toEqual({ hasRecords: true, recordCount: "12" });
  });

  it("rechaza conteos inválidos en lugar de habilitar una publicación", () => {
    expect(() => infolobbyRunOutputs(-1)).toThrow("INFOLOBBY_INVALID_RECORD_COUNT");
    expect(() => infolobbyRunOutputs(1.5)).toThrow("INFOLOBBY_INVALID_RECORD_COUNT");
  });

  it("sale antes de escribir artefactos cuando el rango no trae filas", () => {
    const emptyGuard = ingestScript.indexOf("if (!runOutputs.hasRecords)");
    const firstArtifactWrite = ingestScript.indexOf("const generatedAt");

    expect(emptyGuard).toBeGreaterThanOrEqual(0);
    expect(firstArtifactWrite).toBeGreaterThan(emptyGuard);
  });

  it("omite proyección, publicación R2/Pages y preflight D1 cuando el rango queda vacío", () => {
    expect(workflow).toContain("id: infolobby-ingest");
    expect(workflow).toContain("if: steps.infolobby-ingest.outputs.has_records == 'true'");
    expect(workflow).toContain("if: steps.infolobby-ingest.outputs.has_records == 'true' && inputs.skip_d1 != true");
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch' && steps.infolobby-ingest.outputs.has_records == 'true'");
    expect(workflow).toContain("if: steps.infolobby-ingest.outputs.has_records != 'true'");
  });

  it("revisa el trimestre anterior completo para capturar CSV trimestrales publicados con desfase", () => {
    expect(workflow).toContain("por defecto, inicio del trimestre anterior");
    expect(workflow).toContain('from_date="${INPUT_FROM:-}"');
    expect(workflow).not.toContain("8 days ago");
    expect(ingestScript).toContain('argument("--from") || infoLobbyDefaultFrom(now)');
  });

  it("genera el plan durante la ingestión antes de activar la publicación", () => {
    const ingest = workflow.indexOf("npm run ingest:infolobby");
    const publish = workflow.indexOf("npm run data:publish");

    expect(ingest).toBeGreaterThanOrEqual(0);
    expect(publish).toBeGreaterThan(ingest);
    expect(workflow).not.toContain("npm run data:lake -- --source infolobby");
  });
});
