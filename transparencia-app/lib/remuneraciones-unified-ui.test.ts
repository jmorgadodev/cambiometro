import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd());

describe("interfaz unificada de remuneraciones", () => {
  it("usa el mismo contenedor de lectura para el explorador y el detalle mensual", () => {
    const explorer = readFileSync(join(projectRoot, "components", "remuneraciones", "RemuneracionesUnifiedExplorer.tsx"), "utf8");
    const page = readFileSync(join(projectRoot, "app", "remuneraciones-publicas", "page.tsx"), "utf8");

    expect(explorer).toContain('className="container-main remuneration-unified"');
    expect(page).toContain('className="container-main remuneration-detail-module"');
  });

  it("presenta cada coincidencia como una ficha expandible, sin abrir todas las filas de golpe", () => {
    const explorer = readFileSync(join(projectRoot, "components", "remuneraciones", "RemuneracionesUnifiedExplorer.tsx"), "utf8");

    expect(explorer).toContain("<details key={group[0].personKey}");
    expect(explorer).toContain("Ver ficha y registros");
    expect(explorer).toContain("<summary className=\"remuneration-person-result__summary\">");
    expect(explorer).toContain("La fuente publicó variantes del nombre");
  });

  it("pagina los resultados y deja las fuentes como información, no como controles vacíos", () => {
    const explorer = readFileSync(join(projectRoot, "components", "remuneraciones", "RemuneracionesUnifiedExplorer.tsx"), "utf8");
    const page = readFileSync(join(projectRoot, "app", "remuneraciones-publicas", "page.tsx"), "utf8");

    expect(explorer).toContain("RESULTS_PAGE_SIZE = 15");
    expect(explorer).toContain('className="remuneration-results__pagination"');
    expect(explorer).toContain('window.scrollTo({ top, behavior: "smooth" })');
    expect(explorer).toContain('className="remuneration-source-card"');
    expect(explorer).not.toContain("remuneration-source-row");
    expect(explorer).not.toContain("Datos generales, no pagos individuales");
    expect(page).toContain("<details open className=\"remuneration-panel\">");
  });
});
