import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCheckpointFetch } from "../scripts/etl/checkpoint-cache.mjs";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("ChileCompra checkpoint cache", () => {
  it("stores a successful response atomically and reuses it", async () => {
    const cacheRoot = mkdtempSync(join(tmpdir(), "chilecompra-checkpoint-"));
    temporaryDirectories.push(cacheRoot);
    let requests = 0;
    const checkpointFetch = createCheckpointFetch({
      cacheRoot,
      fetchImpl: async () => {
        requests += 1;
        return Response.json({ ok: true, request: requests });
      },
    });

    const first = await checkpointFetch("https://official.example/document/1");
    const second = await checkpointFetch("https://official.example/document/1");

    expect(await first.json()).toEqual({ ok: true, request: 1 });
    expect(await second.json()).toEqual({ ok: true, request: 1 });
    expect(second.headers.get("X-ETL-Cache")).toBe("hit");
    expect(requests).toBe(1);
    const files = readdirSync(cacheRoot);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.json$/);
    expect(JSON.parse(readFileSync(join(cacheRoot, files[0]), "utf8"))).toEqual({ ok: true, request: 1 });
  });
});
