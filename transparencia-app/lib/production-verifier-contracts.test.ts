import { describe, expect, it } from "vitest";
import { extractCanonicalCount, extractConsolidatedCount } from "../scripts/etl/production-verifier-contracts.mjs";

describe("production verifier source counters", () => {
  it("extrae los conteos visibles sin depender de una cifra histórica fija", () => {
    const html = `
      <dt>Registros Canónicos</dt><dd>1.753.013</dd>
      <p>2.357.705 registros canónicos por fuente · consolidado <strong>1.753.013</strong></p>
    `;

    expect(extractCanonicalCount(html)).toBe(1_753_013);
    expect(extractConsolidatedCount(html)).toBe(1_753_013);
  });

  it("devuelve null cuando el titular no está disponible", () => {
    expect(extractCanonicalCount("<h1>Fuentes</h1>")).toBeNull();
    expect(extractConsolidatedCount("<h1>Fuentes</h1>")).toBeNull();
  });
});
