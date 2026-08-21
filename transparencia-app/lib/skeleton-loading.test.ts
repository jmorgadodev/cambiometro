import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  PoliticoFichaSkeleton,
  MunicipalidadFichaSkeleton,
  ServicioPublicoFichaSkeleton,
  EntityFichaSkeleton,
  ListadoSkeleton,
} from "../components/ui/Skeleton";

describe("Skeleton Loading y Componentes de Transición UX", () => {
  it("renderiza Skeleton base con aria-hidden y estilos correctos", () => {
    const html = renderToString(React.createElement(Skeleton, { width: 120, height: 24, borderRadius: 8 }));
    expect(html).toContain("skeleton-shimmer");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("width:120px");
    expect(html).toContain("height:24px");
  });

  it("renderiza SkeletonCard y SkeletonTable con estructura semántica", () => {
    const cardHtml = renderToString(React.createElement(SkeletonCard));
    expect(cardHtml).toContain("card-flat");
    expect(cardHtml).toContain("skeleton-shimmer");

    const tableHtml = renderToString(React.createElement(SkeletonTable, { rows: 4, cols: 3 }));
    expect(tableHtml).toContain("table-shell");
    expect(tableHtml).toContain("skeleton-shimmer");
  });

  it("renderiza PoliticoFichaSkeleton con masthead, kpis y columnas", () => {
    const html = renderToString(React.createElement(PoliticoFichaSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("page-masthead");
    expect(html).toContain("politico-layout");
    expect(html).toContain("container-main");
  });

  it("renderiza MunicipalidadFichaSkeleton con masthead comunal", () => {
    const html = renderToString(React.createElement(MunicipalidadFichaSkeleton));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("page-masthead");
    expect(html).toContain("container-main");
  });

  it("renderiza ServicioPublicoFichaSkeleton y EntityFichaSkeleton", () => {
    const servHtml = renderToString(React.createElement(ServicioPublicoFichaSkeleton));
    expect(servHtml).toContain('aria-busy="true"');
    expect(servHtml).toContain("page-masthead");

    const entityHtml = renderToString(React.createElement(EntityFichaSkeleton));
    expect(entityHtml).toContain('aria-busy="true"');
    expect(entityHtml).toContain("page-masthead");
  });

  it("renderiza ListadoSkeleton con buscador y grid de tarjetas", () => {
    const html = renderToString(React.createElement(ListadoSkeleton, { title: "Cargando directorio de prueba", cardsCount: 6 }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("page-masthead");
    expect(html).toContain("container-main");
  });

  it("todos los loading.tsx exportan componentes válidos", async () => {
    const rootLoading = (await import("../app/loading")).default;
    const politicoLoading = (await import("../app/politico/loading")).default;
    const politicoDetailLoading = (await import("../app/politico/[id]/loading")).default;
    const muniLoading = (await import("../app/municipalidades/loading")).default;
    const muniDetailLoading = (await import("../app/municipalidades/[id]/loading")).default;
    const servLoading = (await import("../app/servicios-publicos/loading")).default;
    const servDetailLoading = (await import("../app/servicios-publicos/[id]/loading")).default;
    const entidadLoading = (await import("../app/entidades/loading")).default;
    const entidadDetailLoading = (await import("../app/entidades/[id]/loading")).default;
    const partidoLoading = (await import("../app/partidos/loading")).default;
    const personasLoading = (await import("../app/personas/loading")).default;
    const crucesLoading = (await import("../app/cruces/loading")).default;
    const datosLoading = (await import("../app/datos/loading")).default;

    expect(typeof rootLoading).toBe("function");
    expect(typeof politicoLoading).toBe("function");
    expect(typeof politicoDetailLoading).toBe("function");
    expect(typeof muniLoading).toBe("function");
    expect(typeof muniDetailLoading).toBe("function");
    expect(typeof servLoading).toBe("function");
    expect(typeof servDetailLoading).toBe("function");
    expect(typeof entidadLoading).toBe("function");
    expect(typeof entidadDetailLoading).toBe("function");
    expect(typeof partidoLoading).toBe("function");
    expect(typeof personasLoading).toBe("function");
    expect(typeof crucesLoading).toBe("function");
    expect(typeof datosLoading).toBe("function");

    const rendered = renderToString(React.createElement(politicoDetailLoading));
    expect(rendered).toContain("skeleton-shimmer");
  });
});
