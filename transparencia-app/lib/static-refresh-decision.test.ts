import { describe, expect, it } from "vitest";
import { buildStaticInputManifest } from "../scripts/static-site-inputs.mjs";
import { buildReleaseSet } from "../scripts/release-set.mjs";
import { shouldRefreshStaticRelease } from "../scripts/static-refresh-decision.mjs";

const manifest = buildStaticInputManifest({ entries: [{ path: "data/movimientos.json",
  key: `projections/static-site-v1/releases/${"a".repeat(64)}/data/movimientos.json`, size: 10, checksumSha256: "a".repeat(64) }] });
const set = buildReleaseSet(manifest);
const credentials = { accountId: "account", token: "token" };

describe("decisión de Pages después de ETL", () => {
  it("omite la compilación cuando el release publicado coincide y usa sólo dos lecturas", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => Response.json(++calls === 1 ? manifest : set);
    expect(await shouldRefreshStaticRelease({ ...credentials, fetchImpl })).toBe(false);
    expect(calls).toBe(2);
  });
  it("refresca un release anterior válido", async () => {
    const old = buildReleaseSet(buildStaticInputManifest({ entries: [{ ...manifest.files[0], checksumSha256: "b".repeat(64) }] }));
    let calls = 0;
    const fetchImpl: typeof fetch = async () => Response.json(++calls === 1 ? manifest : old);
    expect(await shouldRefreshStaticRelease({ ...credentials, fetchImpl })).toBe(true);
  });
  it("no acepta una caída R2 como un release vacío o como autorización para desplegar", async () => {
    await expect(shouldRefreshStaticRelease({ ...credentials, fetchImpl: async () => new Response(null, { status: 403 }) }))
      .rejects.toThrow("STATIC_REFRESH_R2_403");
  });
  it("rechaza un pin publicado alterado", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => Response.json(++calls === 1 ? manifest : { ...set, releaseSetId: "fake" });
    await expect(shouldRefreshStaticRelease({ ...credentials, fetchImpl })).rejects.toThrow("RELEASE_SET_CHECKSUM");
  });
});
