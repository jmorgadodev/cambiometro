import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function createCheckpointFetch({ cacheRoot, fetchImpl = fetch }) {
  mkdirSync(cacheRoot, { recursive: true });

  function cachePathFor(input) {
    const key = createHash("sha256").update(String(input)).digest("hex");
    return join(cacheRoot, `${key}.json`);
  }

  async function checkpointFetch(input, init) {
    const cachePath = cachePathFor(input);
    if (existsSync(cachePath)) {
      return new Response(readFileSync(cachePath), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-ETL-Cache": "hit" },
      });
    }

    const response = await fetchImpl(input, init);
    if (!response.ok) return response;

    const data = Buffer.from(await response.arrayBuffer());
    const temporaryPath = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, data);
    renameSync(temporaryPath, cachePath);
    return new Response(data, { status: response.status, headers: response.headers });
  }

  checkpointFetch.peekJson = async (input) => {
    const cachePath = cachePathFor(input);
    return existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : undefined;
  };

  return checkpointFetch;
}
