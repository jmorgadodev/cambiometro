import { describe, expect, it } from "vitest";
import {
  extractCanonicalCount,
  extractConsolidatedCount,
  extractInfoLobbyCount,
  hasPublishedParliamentaryDiet,
  hasConsistentPublishedStaffExcess,
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

  it("matches a published diet period rendered as a localized month", () => {
    const html = '<div>$8.239.091</div><span>dieta parlamentaria bruta · Junio 2026</span>';
    expect(hasPublishedParliamentaryDiet(html, "2026-06")).toBe(true);
    expect(hasPublishedParliamentaryDiet(html, "2026-05")).toBe(false);
  });

  it("checks the current staff excess against the displayed official base and total", () => {
    const panel = (percentage, total) => `<section>Personal de Apoyo y Asesores<!-- -->
      <span>Exceso de ${percentage} sobre la base mensual oficial</span>
      <p>Base mensual oficial: $11.406.149. Total publicado: ${total}; traspaso individual acreditado: $0.</p>
    </section>`;
    expect(hasConsistentPublishedStaffExcess(panel("+39,7%", "$15.930.000"))).toBe(true);
    expect(hasConsistentPublishedStaffExcess(panel("+33,7%", "$15.930.000"))).toBe(false);
    expect(hasConsistentPublishedStaffExcess(panel("+33,7%", "$15.250.000"))).toBe(true);
  });

  it("does not require an excess alert when the published staff amount is within the base", () => {
    const panel = `<section>Personal de Apoyo y Asesores
      <p>Base mensual oficial: $11.406.149. Total publicado: $10.000.000.</p>
    </section>`;
    expect(hasConsistentPublishedStaffExcess(panel)).toBe(true);
    expect(hasConsistentPublishedStaffExcess("<section>Other content</section>")).toBe(false);
  });
});
