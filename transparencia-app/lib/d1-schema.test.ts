import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("esquema canonico D1", () => {
  const sql = readFileSync(new URL("../migrations/0010_canonical_data_platform.sql", import.meta.url), "utf8");
  const relationSourceSql = readFileSync(new URL("../migrations/0011_relation_source_index.sql", import.meta.url), "utf8");
  const aliasSql = readFileSync(new URL("../migrations/0012_entity_aliases.sql", import.meta.url), "utf8");

  it.each(["sources", "entities", "records", "relations", "mandates", "etl_runs", "source_state"])(
    "crea la tabla %s",
    (table) => expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i")),
  );

  it.each(["stage_entities", "stage_records", "stage_relations"])(
    "usa staging para %s",
    (table) => expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i")),
  );

  it("crea un snapshot transitorio para confirmar cambios de mandato", () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS mandate_snapshot\b/i);
  });

  it("indexa fechas, fuentes y entidades relacionadas", () => {
    expect(sql).toContain("idx_records_source_date");
    expect(sql).toContain("idx_relations_from");
    expect(sql).toContain("idx_relations_to");
    expect(sql).toContain("idx_mandates_entity_dates");
    expect(relationSourceSql).toContain("idx_relations_source");
    expect(aliasSql).toMatch(/CREATE TABLE IF NOT EXISTS entity_aliases\b/i);
    expect(aliasSql).toContain("idx_entity_aliases_canonical");
  });
});
