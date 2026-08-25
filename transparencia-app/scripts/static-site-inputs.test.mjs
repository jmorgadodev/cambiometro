import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  assertStaticInputManifest,
  buildStaticInputEntries,
  buildStaticInputManifest,
  parseRequestedStaticFiles,
} from "./static-site-inputs.mjs";

describe("static site input release", () => {
  it("builds and validates a checksum manifest from an allowed group", () => {
    const root = mkdtempSync(join(tmpdir(), "cambiometro-static-inputs-"));
    try {
      const file = "data/lake-subsets/chilecompra.subset.json";
      const target = join(root, file.replaceAll("/", "\\"));
      mkdirSync(join(root, "data", "lake-subsets"), { recursive: true });
      writeFileSync(target, "{\"generatedAt\":\"test\"}\n", "utf8");
      const requested = parseRequestedStaticFiles({ groups: ["chilecompra"] });
      assert.equal(requested.length, 2);
      const entries = buildStaticInputEntries({ root, files: [file], releaseId: "a".repeat(64) });
      const manifest = buildStaticInputManifest({ entries });
      assertStaticInputManifest(manifest);
      assert.equal(manifest.files[0].checksumSha256.length, 64);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects files outside the static input allowlist", () => {
    assert.throws(
      () => parseRequestedStaticFiles({ files: ["data/lake/partitions/secret.json"] }),
      /STATIC_INPUT_FILE_NOT_ALLOWED/,
    );
  });
});
