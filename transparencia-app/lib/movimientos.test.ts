import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { MOVIMIENTOS } from "./movimientos";

describe("Módulo /movimientos — Rediseño de Jerarquía, Eliminación de CSV y Anatomía de Card", () => {
  const root = process.cwd();
  const movimientosJsonPath = resolve(root, "data/movimientos.json");
  const movimientosPageSource = readFileSync(resolve(root, "app/movimientos/page.tsx"), "utf8");
  const inventarioCsv = readFileSync(resolve(root, "auditoria_integridad_datos/inventario_completo_etls.csv"), "utf8");
  const arquitecturaMarkdown = readFileSync(resolve(root, "docs/arquitectura-datos.md"), "utf8");

  it("0. ELIMINAR CSV: Cero texto 'CSV' o atributo download en /movimientos", () => {
    expect(movimientosPageSource).not.toContain("Exportar CSV");
    expect(movimientosPageSource).not.toContain("exportarCSV");
    expect(movimientosPageSource).not.toContain("download=");
    expect(movimientosPageSource).not.toContain(".csv");
  });

  it("1. data/movimientos.json existe y tiene estructura authoritative con metadata de pipeline", () => {
    expect(existsSync(movimientosJsonPath)).toBe(true);
    const json = JSON.parse(readFileSync(movimientosJsonPath, "utf8"));
    expect(json.pipeline).toBe("etl_movimientos_autoridades");
    expect(json.frecuencia).toBe("Diario 03:00 CLT");
    expect(json.last_run).toBeDefined();
    expect(json.movimientos.length).toBeGreaterThan(0);
  });

  it("2. Eventos obligatorios del 14-08-2026 presentes (Duco/Deporte y Urrejola/Atacama) con fuentes de prensa", () => {
    // Duco / Deporte
    const duco = MOVIMIENTOS.find(
      (m) =>
        m.cargo.toLowerCase().includes("deporte") ||
        m.salio?.nombre.toLowerCase().includes("duco") ||
        m.saliente?.toLowerCase().includes("duco")
    );
    expect(duco).toBeDefined();
    expect(["2026-08-13", "2026-08-14"]).toContain(duco?.fecha);
    expect(duco?.organismo).toBe("Subsecretaría del Deporte");
    expect(duco?.salio?.motivo_categoria).toBe("Cuestionamiento de gestión");
    expect(duco?.fuentes.length).toBeGreaterThanOrEqual(2);
    const prensaDuco = duco?.fuentes.filter((f) => f.nivel === "prensa");
    expect(prensaDuco?.length).toBeGreaterThanOrEqual(2);

    // Urrejola / Atacama
    const urrejola = MOVIMIENTOS.find(
      (m) =>
        m.cargo.toLowerCase().includes("atacama") ||
        m.salio?.nombre.toLowerCase().includes("urrejola") ||
        m.saliente?.toLowerCase().includes("urrejola")
    );
    expect(urrejola).toBeDefined();
    expect(urrejola?.fecha).toBe("2026-08-14");
    expect(urrejola?.salio?.motivo_categoria).toBe("Renuncia pedida por el Gobierno");
    expect(urrejola?.fuentes.length).toBeGreaterThanOrEqual(2);
  });

  it("3. Scope Completo del Ejecutivo: Presencia de Seremis, Delegados Presidenciales, GOREs y Directores", () => {
    const seremis = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("seremi") || m.organismo.toLowerCase().includes("seremi"));
    expect(seremis.length).toBeGreaterThanOrEqual(2);

    const delegados = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("delegad") || m.organismo.toLowerCase().includes("delegac"));
    expect(delegados.length).toBeGreaterThanOrEqual(2);

    const gores = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("gobernador") || m.organismo.toLowerCase().includes("gobierno regional"));
    expect(gores.length).toBeGreaterThanOrEqual(1);

    const embajadores = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("embajador"));
    expect(embajadores.length).toBeGreaterThanOrEqual(1);
  });

  it("4. Anatomía de Tarjeta y UI: Acordeón para detalle, separación de mes y botón copiar enlace", () => {
    expect(movimientosPageSource).toContain("toggleExpand");
    expect(movimientosPageSource).toContain("▾ Ver detalle");
    expect(movimientosPageSource).toContain("▴ Ocultar detalle");
    expect(movimientosPageSource).toContain("Copiar enlace");
  });

  it("5. Días en el cargo calculado para autoridades salientes con origen", () => {
    const withDays = MOVIMIENTOS.filter((m) => m.dias_en_cargo !== undefined && m.dias_en_cargo !== null);
    expect(withDays.length).toBeGreaterThanOrEqual(10);
    for (const m of withDays) {
      expect(m.dias_en_cargo).toBeGreaterThan(0);
      expect(["oficial", "estimado"]).toContain(m.dias_en_cargo_origen);
    }
  });

  it("6. etl_diario_oficial registrado en inventario_completo_etls.csv y arquitectura-datos.md", () => {
    expect(inventarioCsv).toContain("etl_diario_oficial");
    expect(inventarioCsv).toContain("Diario Oficial de la República de Chile");
    expect(arquitecturaMarkdown).toContain("etl_diario_oficial");
    expect(arquitecturaMarkdown).toContain("Diario Oficial de Chile");
  });

  it("7. Cruce CGR SIAPER: Todo movimiento con motivo 'Contraloría/irregularidad' tiene informe SIAPER CGR asociado", () => {
    const cgrMovs = MOVIMIENTOS.filter((m) => m.salio?.motivo_categoria === "Contraloría/irregularidad");
    expect(cgrMovs.length).toBeGreaterThan(0);
    for (const m of cgrMovs) {
      expect(m.cgr_informe).toBeDefined();
      expect(m.cgr_informe?.numero).toBeDefined();
      expect(m.cgr_informe?.url).toBeDefined();
      expect(m.cgr_informe?.url.startsWith("http")).toBe(true);
    }
  });

  it("8. Trazabilidad 100%: Cero movimientos sin fuente y cero 'verificados' sin URL oficial", () => {
    for (const mov of MOVIMIENTOS) {
      expect(mov.fuentes.length).toBeGreaterThan(0);
      if (mov.estado === "verificado") {
        const hasOficial = mov.fuentes.some((f) => f.nivel === "oficial" || f.nivel === "semioficial");
        expect(hasOficial).toBe(true);
      }
    }
  });
});
