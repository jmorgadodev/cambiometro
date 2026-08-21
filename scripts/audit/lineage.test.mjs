import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { AUDIT_ROOT, DOCS_ROOT } from "./audit-core.mjs";

test("Fase A conserva 70/70 campos y referencias exactas de FIX-1 a FIX-5", async () => {
  const lineage = await readFile(resolve(DOCS_ROOT, "00-linaje.md"), "utf8");
  assert.match(lineage, /Inventario:\*\* 70 campos/);
  assert.match(lineage, /Cobertura de linaje:\*\* 70\/70 \(100%\)/);
  assert.doesNotMatch(lineage, /campo desconocido|linaje desconocido/i);

  const references = [
    ["transparencia-app/lib/gastos-operacionales.ts", 181, "resumirGastosAgregables"],
    ["transparencia-app/scripts/etl/senado-assignment.mjs", 16, "parseSenadoAssignmentPolicy"],
    ["transparencia-app/scripts/etl/r10-chilecompra.mjs", 17, "findBuyerByVerifiedRut"],
    ["transparencia-app/scripts/build-presupuesto-v1.mjs", 101, "latestBudgetSnapshot"],
    ["transparencia-app/scripts/rebuild-authoritative-municipalidades.mjs", 505, "partitionV7Records"],
  ];
  for (const [relative, lineNumber, needle] of references) {
    const lines = (await readFile(resolve(AUDIT_ROOT, relative), "utf8")).split(/\r?\n/);
    assert.match(lines[lineNumber - 1] ?? "", new RegExp(String(needle)));
  }
});
