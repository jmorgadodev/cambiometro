import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { assertNonEmptyChileCompraRelease } from "../chilecompra-release-guard.mjs";

describe("guardia de releases ChileCompra", () => {
  it("bloquea un release vacío para no reemplazar datos válidos", () => {
    assert.throws(
      () => assertNonEmptyChileCompraRelease([]),
      /CHILECOMPRA_EMPTY_RELEASE_BLOCKED/,
    );
  });

  it("permite un release con registros", () => {
    const records = [{ id: "oc-1" }];
    assert.equal(assertNonEmptyChileCompraRelease(records), records);
  });

  it("sólo permite vacío cuando se solicita explícitamente", () => {
    assert.deepEqual(assertNonEmptyChileCompraRelease([], { allowEmpty: true }), []);
  });
});
