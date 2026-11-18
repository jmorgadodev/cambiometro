import { describe, expect, it } from "vitest";
import { assertHtmlIsUsable } from "../scripts/detail-html-guard.mjs";

describe("universo de fichas activas y aplazadas", () => {
  it("sigue exigiendo identidad y HTML utilizable en cada ficha parlamentaria", () => {
    expect(() => assertHtmlIsUsable("<h1>Carlos Bianchi</h1>", "Carlos Bianchi", "politico/carlos-bianchi")).not.toThrow();
    expect(() => assertHtmlIsUsable("<h1>Otra persona</h1>", "Carlos Bianchi", "politico/carlos-bianchi")).toThrow("DETAIL_NAME_MISSING");
    expect(() => assertHtmlIsUsable("Carlos Bianchi", "Carlos Bianchi", "politico/carlos-bianchi")).toThrow("DETAIL_H1_MISSING");
  });
  it("valida el aviso y noindex en las URLs municipales preservadas", () => {
    const html = '<meta name="robots" content="noindex, follow"><h1>Municipalidades<!-- --> está en construcción</h1>';
    expect(() => assertHtmlIsUsable(html, "Municipalidad de O\u0027Higgins", "municipalidades/ohiggins")).not.toThrow();
    expect(() => assertHtmlIsUsable(html.replace("noindex", "index"), "", "municipalidades/ohiggins")).toThrow("DETAIL_CONSTRUCTION_INDEXABLE");
    expect(() => assertHtmlIsUsable('<h1>Municipalidad</h1>', "", "municipalidades/ohiggins")).toThrow("DETAIL_CONSTRUCTION_NOTICE_MISSING");
  });
  it("no admite errores de aplicación como pantalla de construcción", () => {
    expect(() => assertHtmlIsUsable("<h1>Application error</h1>", "", "municipalidades/maipu")).toThrow("DETAIL_HTML_INVALID");
  });
});
