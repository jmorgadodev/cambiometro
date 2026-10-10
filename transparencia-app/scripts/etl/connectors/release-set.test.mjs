import { describe, expect, it } from "vitest";
import { buildStaticInputManifest, sha256Buffer } from "../../static-site-inputs.mjs";
import { buildReleaseSet, assertPinnedReleaseSet, assertReleaseSetPromotion, assertReleaseSetArtifacts } from "../../release-set.mjs";

const entry = (path, digest = "a".repeat(64)) => ({
  path, key: `projections/static-site-v1/releases/${digest}/${path}`,
  size: 128, checksumSha256: digest,
});
const manifest = (files) => buildStaticInputManifest({ entries: files, generatedAt: "2026-10-01T00:00:00Z" });

describe("ReleaseSet local contract", () => {
  it("rejects stale Git or cached bytes even when their manifest metadata matches", () => {
    const bytes = Buffer.from('{"movimientos":[]}');
    const file = { ...entry("data/movimientos.json", sha256Buffer(bytes)), size: bytes.length };
    const input = manifest([file]);
    const set = buildReleaseSet(input);
    expect(assertReleaseSetArtifacts(set, input, () => bytes)).toBe(set);
    expect(() => assertReleaseSetArtifacts(set, input, () => Buffer.from("old Git snapshot"))).toThrow("RELEASE_SET_ARTIFACT_MISMATCH");
    expect(() => assertReleaseSetArtifacts(set, input, () => { throw new Error("missing"); })).toThrow();
  });
  it("pins each static domain without inventing record counts", () => {
    const input = manifest([entry("data/movimientos.json"), entry("data/municipalidades-list.json")]);
    const set = buildReleaseSet(input);
    expect(set.scope).toBe("static-site-inputs");
    expect(Object.keys(set.domains)).toEqual(["movimientos", "municipalidades"]);
    expect(set.domains.movimientos.files[0].recordCount).toBeNull();
    expect(assertPinnedReleaseSet(set, input)).toBe(set);
  });
  it("blocks a UI build with a different or tampered manifest", () => {
    const input = manifest([entry("data/movimientos.json")]);
    const set = buildReleaseSet(input);
    expect(() => assertPinnedReleaseSet(set, manifest([entry("data/movimientos.json", "b".repeat(64))]))).toThrow();
    expect(() => buildReleaseSet({ ...input, generatedAt: "2026-10-02" })).toThrow("RELEASE_SET_MANIFEST_CHECKSUM");
    expect(() => assertPinnedReleaseSet({ ...set, scope: "all-public-data" }, input)).toThrow();
  });
  it("rejects a stale concurrent promotion and accepts a rebuilt combined candidate", () => {
    const a = entry("data/movimientos.json");
    const b = entry("data/municipalidades-list.json");
    const initial = buildReleaseSet(manifest([a, b]));
    const first = buildReleaseSet(manifest([entry(a.path, "b".repeat(64)), b]));
    const stale = buildReleaseSet(manifest([a, entry(b.path, "c".repeat(64))]));
    expect(() => assertReleaseSetPromotion(first, stale, initial.releaseSetId)).toThrow("RELEASE_SET_STALE_BASE");
    const combined = buildReleaseSet(manifest([entry(a.path, "b".repeat(64)), entry(b.path, "c".repeat(64))]));
    expect(assertReleaseSetPromotion(first, combined, first.releaseSetId)).toBe(combined);
  });
});
