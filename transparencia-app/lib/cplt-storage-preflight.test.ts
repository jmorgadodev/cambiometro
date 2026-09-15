import { describe, expect, it } from "vitest";
import { checkWorkspaceCapacity } from "../scripts/check-workspace-capacity.mjs";

describe("preflight de capacidad local CPLT", () => {
  it("permite continuar cuando el espacio libre supera el umbral", () => {
    const result = checkWorkspaceCapacity({ minFreeBytes: 1 });
    expect(result.allowed).toBe(true);
    expect(result.freeBytes).toBeGreaterThan(0);
  });

  it("bloquea cuando el umbral es superior al espacio disponible", () => {
    const result = checkWorkspaceCapacity({ minFreeBytes: Number.MAX_SAFE_INTEGER });
    expect(result.allowed).toBe(false);
  });
});
