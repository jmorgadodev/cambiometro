import { describe, expect, it } from "vitest";
import { isMovementsScopePublic } from "./landing-summary";

describe("publicación del resumen de movimientos", () => {
  it.each(["validated", "validated_reference", "validated_reconciled"])("acepta el estado %s", (status) => {
    expect(isMovementsScopePublic(status)).toBe(true);
  });

  it.each(["draft", "blocked", "failed", null, undefined])("oculta el estado no validado %s", (status) => {
    expect(isMovementsScopePublic(status)).toBe(false);
  });
});
