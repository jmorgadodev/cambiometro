import { describe, expect, it } from "vitest";
import { formatReleaseTimestamp, RELEASE_STATUS_LABELS, shortReleaseChecksum } from "@/lib/release-meta";

describe("release metadata presentation", () => {
  it("uses explicit status labels instead of implying completeness", () => {
    expect(RELEASE_STATUS_LABELS.parcial).toBe("Parcial");
    expect(RELEASE_STATUS_LABELS.no_disponible).toBe("No disponible");
  });

  it("shortens checksums without losing their identity", () => {
    expect(shortReleaseChecksum("1234567890abcdefghijk")).toBe("1234567890…defghijk");
    expect(shortReleaseChecksum(null)).toBe("No publicado");
  });

  it("formats release timestamps in Chilean locale", () => {
    expect(formatReleaseTimestamp("2026-09-06T12:00:00.000Z")).toContain("2026");
    expect(formatReleaseTimestamp(null)).toBe("No publicada");
  });
});
