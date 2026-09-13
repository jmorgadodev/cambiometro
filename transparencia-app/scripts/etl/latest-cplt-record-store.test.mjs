import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LatestCpltRecordStore } from "./latest-cplt-record-store.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("LatestCpltRecordStore", () => {
  it("conserva en disco sólo el período más reciente por identidad", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cplt-latest-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "latest.sqlite");
    const store = new LatestCpltRecordStore(databasePath);

    store.upsert({ stableKey: "persona-a", period: "2025-12", record: { nombre: "anterior" }, organismoId: "maipu" });
    store.upsert({ stableKey: "persona-b", period: "2026-01", record: { nombre: "unico" }, organismoId: "santiago" });
    store.upsert({ stableKey: "persona-a", period: "2026-02", record: { nombre: "vigente" }, organismoId: "maipu" });
    store.upsert({ stableKey: "persona-a", period: "2026-01", record: { nombre: "atrasado" }, organismoId: "maipu" });

    expect(store.size).toBe(2);
    expect([...store.values()]).toEqual([
      { period: "2026-02", record: { nombre: "vigente" }, organismoId: "maipu" },
      { period: "2026-01", record: { nombre: "unico" }, organismoId: "santiago" },
    ]);

    store.close();
    expect(fs.existsSync(databasePath)).toBe(false);
  });

  it("permite validar el lote en orden estable aunque la fuente llegue desordenada", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cplt-latest-sorted-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "latest.sqlite");
    const store = new LatestCpltRecordStore(databasePath);

    store.upsert({ stableKey: "zeta", period: "2026-01", record: { nombre: "Zeta" }, organismoId: "maipu", recordId: "func-zeta" });
    store.upsert({ stableKey: "alfa", period: "2026-01", record: { nombre: "Alfa" }, organismoId: "maipu", recordId: "func-alfa" });

    expect([...store.valuesSortedByRecordId()].map(({ record }) => record.nombre)).toEqual(["Alfa", "Zeta"]);
    store.close();
  });
});
