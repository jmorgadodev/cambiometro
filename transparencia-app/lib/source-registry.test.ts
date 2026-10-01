import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { buildSourceRegistry } from "../scripts/build-source-registry.mjs";

const binding = { "etl-test.yml": { ids: ["sample"], categories: ["payments"], connector: "connector.mjs", file: "data/sample.json" } };
const calendar = { entries: [{ workflow: "etl-test.yml", name: "Sample", cronUtc: "0 7 * * *", local: "Diario" }] };
const workflows = { "etl-test.yml": 'workflow_dispatch:\n schedule:\n  - cron: "0 7 * * *"' };
const sha = "a".repeat(64);
const catalog = { sources: [{ id: "sample", recordCount: 12, foundPeriods: ["2026-09"], indexChecksumSha256: sha, status: "partial" }] };
const staticManifest = { checksumSha256: sha, files: [{ path: "data/sample.json", key: `projections/static-site-v1/releases/${sha}/data/sample.json`, checksumSha256: sha }] };
const build = (overrides = {}) => buildSourceRegistry({ calendar, bindings: binding, workflows, catalog, staticManifest, ...overrides });

describe("source registry", () => {
  it("keeps catalog counts separate from artifact releases and coverage", () => {
    const row = build().sources[0];
    assert.equal(row.catalog[0].recordCount, 12);
    assert.equal(row.artifact.releaseKey, staticManifest.files[0].key);
    assert.equal(row.coverage, "no medida");
    assert.equal(row.mode, "scheduled");
  });
  it("marks missing catalog/artifact evidence without inventing zeros", () => {
    const row = build({ catalog: { sources: [] }, staticManifest: { files: [] } }).sources[0];
    assert.equal(row.catalog[0].recordCount, null);
    assert.equal(row.artifact, null);
    assert.equal(row.catalog[0].checksum, null);
  });
  it("rejects duplicated calendar or catalog sources", () => {
    assert.throws(() => build({ calendar: { entries: [...calendar.entries, ...calendar.entries] } }), /DUPLICATE/);
    assert.throws(() => build({ catalog: { sources: [...catalog.sources, ...catalog.sources] } }), /DUPLICATE/);
  });
  it("rejects undocumented bindings, schedule drift and invalid checksums", () => {
    assert.throws(() => build({ bindings: {} }), /BINDING/);
    assert.throws(() => build({ workflows: { "etl-test.yml": "workflow_dispatch:" } }), /SCHEDULE/);
    assert.throws(() => build({ staticManifest: { files: [{ ...staticManifest.files[0], checksumSha256: "bad" }] } }), /CHECKSUM/);
  });
  it("does not present a manual workflow as scheduled", () => {
    const row = build({ calendar: { entries: [{ ...calendar.entries[0], cronUtc: null }] }, workflows: { "etl-test.yml": "workflow_dispatch:" } }).sources[0];
    assert.equal(row.mode, "manual");
  });
  it("preserves catalog sources without guessing an owning workflow", () => {
    const report = build({ catalog: { sources: [...catalog.sources, { id: "unmapped", recordCount: 4 }] } });
    assert.equal(report.unmappedCatalogSources[0].id, "unmapped");
    assert.equal(report.unmappedCatalogSources[0].recordCount, 4);
  });
  it("records Senate votes as local-only without inventing a remote workflow", () => {
    const row = build().sources.at(-1);
    assert.equal(row.id, "votaciones_senado");
    assert.equal(row.mode, "local-only");
    assert.equal(row.workflow, null);
    assert.equal(row.state, "paused_local_only");
  });
});
