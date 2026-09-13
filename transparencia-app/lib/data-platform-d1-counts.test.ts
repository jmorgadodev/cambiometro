import type { D1Database } from "@cloudflare/workers-types";
import { describe, expect, it, vi } from "vitest";
import { getD1Database } from "./db";
import { listSourceManifests, resolveDataPlatformSummary } from "./data-platform-d1";

vi.mock("./db", () => ({ getD1Database: vi.fn() }));

describe("published D1 counters", () => {
  it("groups parliamentary sources using only ETL counters, including archive-only sources", async () => {
    const queries: string[] = [];
    const db = {
      prepare(sql: string) {
        queries.push(sql);
        if (/FROM records\b/i.test(sql)) throw new Error("historical scan forbidden");
        return { async all() { return { results: [
          { source_id: "camara", record_count: 155, status: "complete" },
          { source_id: "votaciones_camara", record_count: 580, status: "complete" },
          { source_id: "gastos_camara", record_count: 20, status: "complete" },
          { source_id: "servel", record_count: 23894, status: "archive_only" },
        ] }; } };
      },
    } as unknown as D1Database;
    vi.mocked(getD1Database).mockResolvedValue(db);
    const sources = await listSourceManifests();
    expect(sources.find((source) => source.id === "camara")?.recordCount).toBe(755);
    expect(sources.find((source) => source.id === "servel")).toMatchObject({ recordCount: 23894, storageTier: "r2" });
    expect(queries).toHaveLength(1);
  });

  it("returns the published total and date without reading historical rows", async () => {
    const prepare = vi.fn((sql: string) => {
      if (/FROM records\b/i.test(sql)) throw new Error("historical scan forbidden");
      return { first: async () => ({ total: 1753013, updated_at: "2026-09-05T00:00:00Z" }) };
    });
    const db = { prepare } as unknown as D1Database;
    const fallback = vi.fn();
    await expect(resolveDataPlatformSummary(db, fallback)).resolves.toEqual({ totalRecords: 1753013, updatedAt: "2026-09-05T00:00:00Z" });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });
});
