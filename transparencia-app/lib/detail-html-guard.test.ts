import { describe, expect, it } from "vitest";
import { assertHtmlIsUsable } from "../scripts/detail-html-guard.mjs";

describe("universo de fichas activas y aplazadas", () => {
  it("exige identidad y HTML utilizable en cada ficha parlamentaria", () => {
    expect(() => assertHtmlIsUsable("<h1>Carlos Bianchi</h1>", "Carlos Bianchi", "politico/carlos-bianchi")).not.toThrow();
    expect(() => assertHtmlIsUsable("<h1>Otra persona</h1>", "Carlos Bianchi", "politico/carlos-bianchi")).toThrow("DETAIL_NAME_MISSING");
    expect(() => assertHtmlIsUsable("Carlos Bianchi", "Carlos Bianchi", "politico/carlos-bianchi")).toThrow("DETAIL_H1_MISSING");
  });
  it("conserva el contenido municipal junto al aviso y noindex", () => {
    const notice = '<section aria-label="Aviso de apartado en desarrollo" role="note"><strong>Municipalidades<!-- --> está en construcción</strong></section>';
    const html = '<meta name="robots" content="noindex, follow">' + notice + '<h1>Municipalidad de <!-- -->O&#x27;Higgins</h1>';
    const check = (value: string) => assertHtmlIsUsable(value, "Municipalidad de O'Higgins", "municipalidades/ohiggins");
    expect(() => check(html)).not.toThrow();
    expect(() => check(html.replace("noindex", "index"))).toThrow("DETAIL_CONSTRUCTION_INDEXABLE");
    expect(() => check(html.replace(notice, ''))).toThrow("DETAIL_CONSTRUCTION_NOTICE_MISSING");
    expect(() => check(html.replace("O&#x27;Higgins", "Otra comuna"))).toThrow("DETAIL_NAME_MISSING");
    expect(() => check('<meta name="robots" content="noindex"><h1>Municipalidades está en construcción</h1>')).toThrow("DETAIL_CONSTRUCTION_NOTICE_MISSING");
  });
  it("no admite errores de aplicación como pantalla de construcción", () => {
    expect(() => assertHtmlIsUsable("<h1>Application error</h1>", "", "municipalidades/maipu")).toThrow("DETAIL_HTML_INVALID");
  });
});
