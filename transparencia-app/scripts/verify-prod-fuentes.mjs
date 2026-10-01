import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL ?? "https://cambiometro.impulsacv.cl";
const response = await fetch(new URL("/data/data-quality-summary.json", baseUrl));
assert.equal(response.status, 200, "public summary must be available");
const summary = await response.json();
assert.equal(summary.schemaVersion, 1);
assert.match(summary.manifestChecksumSha256, /^[a-f0-9]{64}$/);
const total = Number.isSafeInteger(summary.totalCanonicalRecords) && summary.totalCanonicalRecords >= 0
  ? summary.totalCanonicalRecords.toLocaleString("es-CL") : "Conteo conjunto no calculable";
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const navigation = await page.goto(new URL("/fuentes/", baseUrl).href, { waitUntil: "networkidle" });
    assert.equal(navigation.status(), 200);
    assert.equal(await page.locator("h1").textContent(), "Fuentes y versiones");
    const facts = await page.locator(".page-fact-sheet dd").allTextContents();
    assert.equal(facts[0], total);
    assert.equal(facts[1], `${summary.sources.length} (${summary.sources.filter((source) => !source.derived).length} oficiales + ${summary.sources.filter((source) => source.derived).length} derivada)`);
    assert.equal(facts[2], summary.manifestChecksumSha256.slice(0, 16));
    assert.equal(await page.locator("article.card").count(), summary.sources.length);
    for (const source of summary.sources) {
      const card = page.locator("article.card").filter({ has: page.getByRole("heading", { name: source.label, exact: true }) });
      const text = await card.innerText();
      assert.ok(text.includes(source.period), `${source.id}: period mismatch`);
      if (!source.reconciliation.comparisonEligible && source.reconciliation.state !== "release_override") {
        assert.ok(text.includes("Conteo no medido para este corte"), `${source.id}: unreconciled count exposed`);
      } else {
        const count = source.reconciliation.state === "release_override" ? source.publicHistoricalCount ?? source.canonicalCount : source.canonicalCount;
        assert.ok(text.includes(count.toLocaleString("es-CL")), `${source.id}: count mismatch`);
      }
      if (source.status === "parcial" && !source.derived) assert.ok(/cobertura parcial/i.test(text), `${source.id}: partial status lost`);
    }
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}px`);
    await page.close();
  }
  console.log(JSON.stringify({ ok: true, baseUrl, sources: summary.sources.length, total, checksum: summary.manifestChecksumSha256, widths: [320, 1440] }));
} finally {
  await browser.close();
}
