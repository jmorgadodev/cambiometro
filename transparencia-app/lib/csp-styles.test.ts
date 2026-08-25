import { describe, expect, it } from "vitest";
import { serializeCspStyle } from "./csp-styles";

describe("csp styles", () => {
  it("preserva unidades como React al generar declaraciones", () => {
    expect(serializeCspStyle({ padding: 4, opacity: 0.5, flexShrink: 0 })).toBe("padding:4px;opacity:0.5;flex-shrink:0");
  });

  it("descarta valores que podrían cerrar o inyectar CSS", () => {
    expect(serializeCspStyle({ color: "red;background:url(https://x);body{display:none}" })).toBe("");
  });
});
