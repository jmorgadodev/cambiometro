import type { D1Database } from "@cloudflare/workers-types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveEntityScope, selectRowsByIds } from "./data-platform-d1";

describe("consultas D1 de cruces", () => {
  it("agrupa IDs y usa un solo batch en vez de una consulta por relación", async () => {
    let batchCalls = 0;
    const prepared: Array<{ sql: string; values: string[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: string[]) {
            const statement = { sql, values };
            prepared.push(statement);
            return statement;
          },
        };
      },
      async batch(statements: Array<{ sql: string; values: string[] }>) {
        batchCalls += 1;
        return statements.map((statement) => ({
          success: true,
          results: statement.values.map((id) => ({ id })),
          meta: {},
        }));
      },
    } as unknown as Pick<D1Database, "prepare" | "batch">;

    const ids = Array.from({ length: 81 }, (_, index) => `entity-${index}`);
    const rows = await selectRowsByIds<{ id: string }>(db, "entities", [...ids, ids[0]]);

    expect(batchCalls).toBe(1);
    expect(prepared).toHaveLength(2);
    expect(rows).toHaveLength(81);
    expect(prepared.every((statement) => statement.sql.startsWith("SELECT * FROM entities WHERE id IN"))).toBe(true);
  });
});

describe("alias canonicos en consultas D1", () => {
  it("expande el ID de Camara a la persona equivalente de InfoProbidad", async () => {
    const db = {
      prepare() {
        return {
          bind() {
            return {
              async all() {
                return {
                  results: [{
                    alias_id: "person-infoprobidad-854b",
                    canonical_id: "person-camara-1002",
                  }],
                };
              },
            };
          },
        };
      },
    } as unknown as Pick<D1Database, "prepare">;

    await expect(resolveEntityScope(db, "person-camara-1002")).resolves.toEqual({
      canonicalId: "person-camara-1002",
      ids: ["person-camara-1002", "person-infoprobidad-854b"],
    });
  });

  it("reconstruye relaciones documentales desde los indices sujeto y objeto", () => {
    const source = readFileSync(resolve("lib/data-platform-d1.ts"), "utf8");
    expect(source).toContain("FROM record_subjects subjects");
    expect(source).toContain("JOIN record_objects objects");
    expect(source).toContain("infolobby");
    expect(source).toContain("chilecompra");
    expect(source).toContain("ley-19862");
    expect(source).toContain("gastos_camara");
    expect(source).toContain("votaciones_senado");
    expect(source).toContain("WHEN 'attendance' THEN 'has_attendance_record'");
    expect(source).toContain("WHEN 'vote' THEN 'has_vote_record'");
    expect(source).toContain("WHEN 'expense' THEN 'has_expense_record'");
  });
});
