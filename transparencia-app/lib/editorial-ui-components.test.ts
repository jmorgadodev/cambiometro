import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("componentes editoriales compartidos", () => {
  it("el contador preserva el ancho y respeta movimiento reducido", () => {
    const source = readFileSync(resolve(root, "components/ui/MechanicalCounter.tsx"), "utf8");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("minimumIntegerDigits");
    expect(source).toContain("minWidth");
    expect(source).toContain("aria-label");
  });

  it("Reveal admite aparición sin desplazamiento y movimiento reducido", () => {
    const source = readFileSync(resolve(root, "components/Reveal.tsx"), "utf8");
    expect(source).toContain('direction?: "up" | "none"');
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("reveal--fade");
  });
});
