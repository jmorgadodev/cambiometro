import { describe, expect, it } from "vitest";
import { hasOfficialMovementEvidence, validateMovementFreshness } from "./movement-release-freshness.mjs";

const completedAt = Date.parse("2026-09-23T13:55:09.000Z");
const staleSuccess = "2026-09-15T00:00:00.000Z";

describe("validateMovementFreshness", () => {
  it("accepts the reconciled 46-row release when the static manifest was republished after the ETL", () => {
    const payload = {
      release_id: "kast-2026-succession-reconciled-2026-09-14",
      release_status: "published_reconciled",
      last_success_at: staleSuccess,
      checksum_sha256: "a".repeat(64),
      movimientos: Array.from({ length: 46 }, (_, index) => ({ id: `movement-${index}` })),
    };
    const manifest = {
      generatedAt: "2026-09-23T13:57:15.079Z",
      datasets: {
        movimientos: {
          count: 46,
          pipelineChecksumSha256: payload.checksum_sha256,
        },
      },
    };

    expect(() => validateMovementFreshness(payload, manifest, completedAt)).not.toThrow();
  });

  it("rejects a reconciled release if its static manifest checksum does not match the payload", () => {
    const payload = {
      release_id: "kast-2026-succession-reconciled-2026-09-14",
      release_status: "published_reconciled",
      last_success_at: staleSuccess,
      checksum_sha256: "a".repeat(64),
      movimientos: Array.from({ length: 46 }, (_, index) => ({ id: `movement-${index}` })),
    };
    const manifest = {
      generatedAt: "2026-09-23T13:57:15.079Z",
      datasets: { movimientos: { count: 46, pipelineChecksumSha256: "b".repeat(64) } },
    };

    expect(() => validateMovementFreshness(payload, manifest, completedAt)).toThrow("MOVIMIENTOS_MANIFEST_CHECKSUM_MISMATCH");
  });

  it("rejects a republish whose static manifest predates the ETL run", () => {
    const payload = {
      release_id: "kast-2026-succession-reconciled-2026-09-14",
      release_status: "published_reconciled",
      last_success_at: staleSuccess,
      checksum_sha256: "a".repeat(64),
      movimientos: Array.from({ length: 46 }, (_, index) => ({ id: `movement-${index}` })),
    };
    const manifest = {
      generatedAt: "2026-09-23T13:40:00.000Z",
      datasets: { movimientos: { count: 46, pipelineChecksumSha256: payload.checksum_sha256 } },
    };

    expect(() => validateMovementFreshness(payload, manifest, completedAt)).toThrow("MOVIMIENTOS_RELEASE_NOT_REFRESHED_AFTER_ETL");
  });

  it("still rejects an old source timestamp for a non-reconciled release", () => {
    const payload = {
      release_id: "kast-2026-daily-update",
      release_status: "published",
      last_success_at: staleSuccess,
      checksum_sha256: "a".repeat(64),
      movimientos: Array.from({ length: 79 }, (_, index) => ({ id: `movement-${index}` })),
    };
    const manifest = {
      generatedAt: "2026-09-23T13:57:15.079Z",
      datasets: { movimientos: { count: 79, pipelineChecksumSha256: payload.checksum_sha256 } },
    };

    expect(() => validateMovementFreshness(payload, manifest, completedAt)).toThrow("MOVIMIENTOS_RELEASE_NOT_REFRESHED_AFTER_ETL");
  });
});

describe("hasOfficialMovementEvidence", () => {
  it("recognizes official documents attached to records even if connector health is classified as public", () => {
    const payload = {
      source_health: [{ tier: "public", ok: true }],
      movimientos: [{ fuentes: [{ nivel: "oficial", url: "https://example.cl/decreto" }] }],
    };

    expect(hasOfficialMovementEvidence(payload)).toBe(true);
  });

  it("recognizes official-source signals awaiting confirmation", () => {
    const payload = {
      source_health: [{ tier: "public", ok: true }],
      movimientos: [],
      signals: [{ source_tier: "official", status: "en_confirmacion" }],
    };

    expect(hasOfficialMovementEvidence(payload)).toBe(true);
  });

  it("does not treat a public connector by itself as official evidence", () => {
    const payload = {
      source_health: [{ tier: "public", ok: true }],
      movimientos: [{ fuentes: [{ nivel: "prensa" }] }],
      signals: [],
    };

    expect(hasOfficialMovementEvidence(payload)).toBe(false);
  });
});
