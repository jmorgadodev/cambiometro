import { describe, expect, it } from "vitest";
import {
  extractCanonicalCount,
  extractConsolidatedCount,
  extractInfoLobbyCount,
  hasPublishedParliamentaryDiet,
  isRetryableHttpStatus,
  parseDisplayedInteger,
} from "../production-verifier-contracts.mjs";

describe("production verifier contracts", () => {
  it("parses locale-formatted counts without depending on a historical value", () => {
    expect(parseDisplayedInteger("71.467")).toBe(71467);
    expect(parseDisplayedInteger("no publicado")).toBeNull();
  });

  it("extracts the current InfoLobby tile", () => {
    const html = '<div class="stat-tile__value">71.467</div><div class="stat-tile__label">Registros InfoLobby</div>';
    expect(extractInfoLobbyCount(html)).toBe(71467);
  });

  it("extracts canonical and consolidated counts independently", () => {
    const html = '<dt>Registros Canónicos</dt><dd>2.357.705</dd><p>consolidado 1.753.013</p>';
    expect(extractCanonicalCount(html)).toBe(2357705);
    expect(extractConsolidatedCount(html)).toBe(1753013);
  });

  it("marks transient edge responses as retryable", () => {
    expect(isRetryableHttpStatus(200)).toBe(false);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
  });

  it("accepts the current published diet without freezing a historical amount", () => {
    const html = '<div>$8.239.091</div><span>dieta parlamentaria bruta · 2026-06</span>';
    expect(hasPublishedParliamentaryDiet(html, "2026-06")).toBe(true);
    expect(hasPublishedParliamentaryDiet(html, "2026-05")).toBe(false);
  });
});
