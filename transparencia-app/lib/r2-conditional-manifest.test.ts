import { describe, expect, it } from "vitest";
import { readConditionalManifest, putConditionalManifest, changedManifestEntries } from "../scripts/etl/r2-conditional-manifest.mjs";

describe("publicación condicional del manifiesto R2", () => {
  it("conserva referencias de contenido idéntico sin generar otro release", () => {
    const old = { path: "data/a.json", key: "old/a", size: 3, checksumSha256: "abc" };
    expect(changedManifestEntries([{ ...old, key: "new/a" }], { files: [old] })).toEqual([]);
    const updated = { ...old, checksumSha256: "changed" };
    expect(changedManifestEntries([updated], { files: [old] })).toEqual([updated]);
  });
  it("rechaza la base de un segundo ETL y permite rearmar ambos cambios", async () => {
    let version = 1;
    let stored: Record<string, string> = { a: "old", b: "old" };
    const fetchImpl: typeof fetch = async (_url, options = {}) => {
      if (options.method === "GET") return Response.json(stored, { headers: { etag: `"${version}"` } });
      if (new Headers(options.headers).get("If-Match") !== `"${version}"`) return new Response(null, { status: 412 });
      stored = JSON.parse(String(options.body)); version++;
      return new Response(null, { status: 200 });
    };
    const first = await readConditionalManifest({ url: "https://r2.test/manifest", fetchImpl });
    const second = await readConditionalManifest({ url: "https://r2.test/manifest", fetchImpl });
    await putConditionalManifest({ url: "https://r2.test/manifest", etag: first.etag, body: JSON.stringify({ ...first.manifest, a: "new" }), fetchImpl });
    await expect(putConditionalManifest({ url: "https://r2.test/manifest", etag: second.etag, body: JSON.stringify({ ...second.manifest, b: "new" }), fetchImpl }))
      .rejects.toThrow("R2_MANIFEST_STALE_BASE");
    expect(stored).toEqual({ a: "new", b: "old" });
    const current = await readConditionalManifest({ url: "https://r2.test/manifest", fetchImpl });
    await putConditionalManifest({ url: "https://r2.test/manifest", etag: current.etag, body: JSON.stringify({ ...current.manifest, b: "new" }), fetchImpl });
    expect(stored).toEqual({ a: "new", b: "new" });
  });

  it("detiene lecturas denegadas y ETags ausentes sin realizar PUT", async () => {
    await expect(readConditionalManifest({ url: "https://r2.test/manifest", fetchImpl: async () => new Response(null, { status: 403 }) }))
      .rejects.toThrow("R2_MANIFEST_READ_403");
    await expect(readConditionalManifest({ url: "https://r2.test/manifest", fetchImpl: async () => Response.json({}) }))
      .rejects.toThrow("R2_MANIFEST_STRONG_ETAG_REQUIRED");
    await expect(putConditionalManifest({ url: "https://r2.test/manifest", etag: "", body: "{}", fetchImpl: async () => { throw new Error("PUT_UNEXPECTED"); } }))
      .rejects.toThrow("R2_MANIFEST_STRONG_ETAG_REQUIRED");
  });
});
