import { describe, expect, it } from "vitest";
import { decodeEntitiesOnce, stripMarkup } from "../scripts/etl/safe-text.mjs";

describe("normalización segura de texto externo", () => {
  it("elimina etiquetas completas sin dejar una etiqueta creada por reemplazos", () => {
    expect(stripMarkup("Nombre<script>alert(1)</script><b> válido</b>"))
      .toBe("Nombrealert(1) válido");
  });

  it("decodifica entidades en una sola pasada para evitar doble interpretación", () => {
    expect(decodeEntitiesOnce("uno&amp;dos &amp;lt;script&amp;gt; &#39;x&#39;"))
      .toBe("uno&dos &lt;script&gt; 'x'");
  });
});
