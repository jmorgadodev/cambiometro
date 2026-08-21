import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getServicioPublicoEnriquecido, getAllServiciosPublicosEnriquecidos } from "./servicios-publicos-data";
import { presupuestoParaServicio, getPresupuestoNacionalTotales } from "./presupuesto";
import { queryFallbackFuncionarios, getFallbackFuncionarios } from "./funcionarios-fallback";

describe("Dashboard Integral de Servicios Públicos y Eliminación de Bloques Ciegos", () => {
  const pageSource = readFileSync(resolve("app/servicios-publicos/[id]/page.tsx"), "utf8");
  const dashboardClientSource = readFileSync(resolve("components/servicios/ServicioPublicoDashboardClient.tsx"), "utf8");
  const directoryClientSource = readFileSync(resolve("app/servicios-publicos/servicios-publicos-client.tsx"), "utf8");

  it("S1. Paginación a 20 por página en directorio general", () => {
    expect(directoryClientSource).toContain("itemsPerPage = 20");
    expect(directoryClientSource).toContain("pagedServicios");
    expect(directoryClientSource).toContain("« Primera");
    expect(directoryClientSource).toContain("Última »");
    expect(directoryClientSource).toContain("20 por página");
  });

  it("S2. KPIs de cabecera con valores vigentes DIPRES y 69 entidades con partida", () => {
    const dipres = getPresupuestoNacionalTotales();
    expect(dipres.count).toBeGreaterThan(0);
    expect(dipres.vigente).toBeGreaterThan(0);

    expect(directoryClientSource).toContain("Presupuesto Ley Inicial");
    expect(directoryClientSource).toContain("Gasto Devengado / Ejecutado");
    expect(directoryClientSource).toContain("con partida o capítulo DIPRES");
    expect(directoryClientSource).toContain("pendiente de publicación");
  });

  it("S3. Dotaciones reales y diferenciadas por institución (no placeholders idénticos)", () => {
    const minagri = getServicioPublicoEnriquecido("min-agricultura");
    const bbnn = getServicioPublicoEnriquecido("min-bienesnacionales");
    const ciencia = getServicioPublicoEnriquecido("min-ciencia");
    const interior = getServicioPublicoEnriquecido("min-interior");

    expect(minagri?.personal?.dotacion_total).toBe(610);
    expect(bbnn?.personal?.dotacion_total).toBe(460);
    expect(ciencia?.personal?.dotacion_total).toBe(210);
    expect(interior?.personal?.dotacion_total).toBe(1150);

    // Aserción estricta: dotación(MINAGRI) !== dotación(BBNN) !== dotación(Ciencia)
    expect(minagri?.personal?.dotacion_total).not.toBe(bbnn?.personal?.dotacion_total);
    expect(minagri?.personal?.dotacion_total).not.toBe(ciencia?.personal?.dotacion_total);
    expect(bbnn?.personal?.dotacion_total).not.toBe(ciencia?.personal?.dotacion_total);
  });

  it("S4. Ministerios no son 'subordinados' y cuentan con desglose de subtítulos 21/22/29", () => {
    const minagri = presupuestoParaServicio("min-agricultura");
    expect(minagri).not.toBeNull();
    expect(minagri?.partida).toBe("13");
    expect(minagri?.vigente_clp).toBeGreaterThan(2_000_000_000_000); // > $2 billones
    expect(minagri?.inicial_ley_clp).toBeGreaterThan(0);
    expect(minagri?.subtitulos && minagri.subtitulos.length).toBeGreaterThan(0);

    // Verificar subtítulos clave
    const subtitulos = minagri?.subtitulos?.map((s) => s.subtitulo) ?? [];
    expect(subtitulos).toContain("21"); // Personal
    expect(subtitulos).toContain("22"); // Bienes y Servicios
    expect(subtitulos).toContain("29"); // Activos No Financieros

    expect(dashboardClientSource).toContain("Desglose por Subtítulos Presupuestarios (Gastos 21, 22, 24, 29, 31)");
  });

  it("S5. R10 no fabrica nómina ni dotación cuando MINAGRI no tiene proyección oficial", () => {
    const funcionariosMinagri = getFallbackFuncionarios("min-agricultura");
    expect(funcionariosMinagri).toEqual([]);

    const queryResult = queryFallbackFuncionarios({ organismoId: "min-agricultura", page: 1, limit: 20 });
    expect(queryResult.totalHeadcount).toBe(0);
    expect(queryResult.total).toBe(0);
    expect(queryResult.data).toEqual([]);
  });

  it("S6. R10 omite compras si el catálogo no aporta RUT jurídico verificable", () => {
    const minagri = getServicioPublicoEnriquecido("min-agricultura");
    expect(minagri?.compras).toBeNull();
    expect(dashboardClientSource).toContain("Sin enlace verificable por RUT jurídico");
  });

  it("S7. InfoLobby no inventa agregados ni timeline cuando no hay registros oficiales", () => {
    const minagri = getServicioPublicoEnriquecido("min-agricultura");
    expect(minagri?.resumen_lobby).toBeDefined();
    expect(minagri?.resumen_lobby?.total_audiencias).toBe(0);
    expect(Object.keys(minagri?.resumen_lobby?.conteo_por_ano ?? {}).length).toBeGreaterThan(0);
    expect(minagri?.resumen_lobby?.top_gestores).toEqual([]);
    expect(minagri?.resumen_lobby?.top_materias).toEqual([]);
    expect(minagri?.audiencias_lobby).toEqual([]);

    expect(dashboardClientSource).toContain("Distribución por Año");
    expect(dashboardClientSource).toContain("Top Gestores de Interés");
    expect(dashboardClientSource).toContain("Materias más Tratadas");
    expect(dashboardClientSource).toContain("Ver en InfoLobby ↗");
  });

  it("S8. Lobby representa ausencia oficial con cero y listas vacías", () => {
    const all = getAllServiciosPublicosEnriquecidos();
    for (const s of all) {
      const lobby = s.resumen_lobby;
      expect(lobby).toBeDefined();
      expect(lobby.total_audiencias).toBe(lobby.audiencias.length);
      expect(lobby.audiencias_directas_count).toBe(lobby.audiencias.length);
      expect(lobby.audiencias_ministerio_tutelar).toEqual([]);
    }

    expect(dashboardClientSource).toContain("0 audiencias directas en el período");
    expect(dashboardClientSource).not.toContain("|| 3");
  });

  it("M1. Manejo de porcentajes de avance absurdos en subtítulos (>999.9%)", () => {
    expect(dashboardClientSource).toContain("⚠ >999%");
    expect(dashboardClientSource).toContain("Ejecutado supera el vigente por reembolsos/reclasificaciones; revisar clasificación");
  });

  it("M2. Precisión de Gasto Mensual Salarios con 3 cifras significativas y tooltip exacto", () => {
    expect(dashboardClientSource).toContain("minimumFractionDigits: 3");
    expect(dashboardClientSource).toContain("maximumFractionDigits: 3");
    expect(dashboardClientSource).toContain("Monto exacto mensual:");
  });

  it("M3. Tooltip de ámbito en KPI de Presupuesto Ley Inicial del listado", () => {
    expect(directoryClientSource).toContain("Suma de presupuestos institucionales monitoreados; incluye transferencias internas.");
    expect(directoryClientSource).not.toContain("$83,42 billones");
  });
});
