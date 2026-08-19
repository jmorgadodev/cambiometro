import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Eliminación de Scroll Infinito y Explorador por Acordeones Paginados", () => {
  const accordionSource = readFileSync(resolve("components/records/EntityEvidenceAccordionExplorer.tsx"), "utf8");
  const personProfileSource = readFileSync(resolve("components/PersonEntityProfile.tsx"), "utf8");
  const entityPageSource = readFileSync(resolve("app/entidades/[id]/page.tsx"), "utf8");

  it("verifica que EntityEvidenceAccordionExplorer implemente paginación compacta con límite de 15 filas", () => {
    expect(accordionSource).toContain("pageSize");
    expect(accordionSource).toContain("setPageSize(Number(e.target.value))");
    expect(accordionSource).toContain("const [pageSize, setPageSize] = useState(15);");
    expect(accordionSource).toContain("‹ Anterior");
    expect(accordionSource).toContain("Siguiente ›");
    expect(accordionSource).toContain("Página");
    expect(accordionSource).toContain("de {totalPages}");
  });

  it("verifica que se definan los acordeones temáticos según el origen de datos", () => {
    expect(accordionSource).toContain("Declaraciones de Patrimonio e Intereses (InfoProbidad / CPLT)");
    expect(accordionSource).toContain("Contratos, Compras y Órdenes de Compra (ChileCompra / OCDS)");
    expect(accordionSource).toContain("Audiencias y Gestiones de Lobby (InfoLobby)");
    expect(accordionSource).toContain("Auditorías, Dictámenes y Fiscalizaciones (Contraloría - CGR)");
    expect(accordionSource).toContain("Nómina, Remuneraciones y Personal (Transparencia Activa)");
  });

  it("verifica los filtros en tiempo real: búsqueda rápida, selector de categoría y selector de año", () => {
    expect(accordionSource).toContain("Buscar por declarante, materia, RUT o código...");
    expect(accordionSource).toContain("Todas las categorías");
    expect(accordionSource).toContain("Todos los años");
    expect(accordionSource).toContain("Limpiar filtros ✕");
  });

  it("verifica la estructura de columnas de la tabla compacta y colores contextuales", () => {
    expect(accordionSource).toContain("<th style={{ padding: \"0.75rem 1rem\", width: 110 }}>Fecha</th>");
    expect(accordionSource).toContain("Persona / Entidad");
    expect(accordionSource).toContain("Materia / Acto");
    expect(accordionSource).toContain("Acción / Origen");
    expect(accordionSource).toContain("Ver Origen ↗");
  });

  it("verifica que PersonEntityProfile y app/entidades/[id]/page.tsx utilicen EntityEvidenceAccordionExplorer", () => {
    expect(personProfileSource).toContain("EntityEvidenceAccordionExplorer");
    expect(personProfileSource).toContain("<EntityEvidenceAccordionExplorer records={records} entityName={entity.name} />");

    expect(entityPageSource).toContain("EntityEvidenceAccordionExplorer");
    expect(entityPageSource).toContain("<EntityEvidenceAccordionExplorer");
  });
});
