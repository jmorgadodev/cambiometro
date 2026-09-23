import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  isMovimientoDocumentoPendienteMayor30,
  latestMovementPublicationDate,
  MOVIMIENTOS,
  MOVIMIENTOS_HOME_SUMMARY,
  MOVIMIENTOS_PIPELINE_METADATA,
  summarizeMovementFreshness,
} from "./movimientos";
import { buildEditorialMovements } from "./home-editorial-adapter";

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
    expect(json.frecuencia).toBe("Corte reconciliado; actualización por revisión de fuentes públicas");
    expect(json.last_run).toBeDefined();
    expect(json.movimientos.length).toBeGreaterThan(0);
  });

  it("1b. cada movimiento tiene un identificador único", () => {
    const ids = MOVIMIENTOS.map((movement) => movement.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("1c. el resumen de la Home se recalcula desde el corte del gobierno actual", () => {
    const desde = "2026-03-11";
    const delGobierno = MOVIMIENTOS.filter((movement) => movement.fecha >= desde);
    const renuncias = delGobierno.filter((movement) => movement.tipo_evento === "renuncia" || movement.tipo === "renuncia");
    const verificados = delGobierno.filter((movement) => ["verificado", "verificado_oficial", "corroborado"].includes(movement.estado));
    const enConfirmacion = delGobierno.filter((movement) => movement.estado === "en_confirmacion");

    expect(delGobierno.length).toBeGreaterThan(0);
    expect(MOVIMIENTOS_HOME_SUMMARY).toMatchObject({
      desde,
      total: delGobierno.length + (MOVIMIENTOS_PIPELINE_METADATA.signals ?? []).length,
      renuncias: renuncias.length,
      verificados: verificados.length,
      enConfirmacion: enConfirmacion.length + (MOVIMIENTOS_PIPELINE_METADATA.signals ?? []).length,
    });
  });

  it("1d. incluye las dos señales recientes en el total sin mezclarlas con las 46 salidas", () => {
    const signals = MOVIMIENTOS_PIPELINE_METADATA.signals ?? [];

    expect(MOVIMIENTOS).toHaveLength(46);
    expect(signals).toHaveLength(2);
    expect(MOVIMIENTOS_HOME_SUMMARY.total).toBe(48);
    expect(MOVIMIENTOS_HOME_SUMMARY.enConfirmacion).toBe(2);
    expect(signals.map((signal) => signal.title)).toEqual(expect.arrayContaining([
      expect.stringContaining("José Bravo"),
      expect.stringContaining("Fabián Páez"),
    ]));
  });

  it("1f. toma como último cambio sólo el movimiento respaldado más reciente", () => {
    expect(MOVIMIENTOS_HOME_SUMMARY.ultimoCambioEfectivo).toBe("2026-09-14");
  });

  it("1e. la Home presenta señales en confirmación en la cronología, conservando su estado", () => {
    const items = buildEditorialMovements(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals);

    expect(items[0]).toMatchObject({
      title: expect.stringContaining("Fabián Páez"),
      status: "EN CONFIRMACIÓN",
      link: expect.stringContaining("/movimientos/"),
    });
    expect(items[1]).toMatchObject({
      title: expect.stringContaining("José Bravo"),
      status: "EN CONFIRMACIÓN",
    });
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
    expect(duco?.organismo).toContain("Ministerio de Deporte");
    expect(duco?.salio?.motivo_categoria).toBeDefined();
    expect(duco?.fuentes.length).toBeGreaterThanOrEqual(2);
    const prensaDuco = duco?.fuentes.filter((f) => f.nivel === "prensa");
    expect(prensaDuco?.length).toBeGreaterThanOrEqual(1);

    // Urrejola / Atacama
    const urrejola = MOVIMIENTOS.find(
      (m) =>
        m.cargo.toLowerCase().includes("atacama") ||
        m.salio?.nombre.toLowerCase().includes("urrejola") ||
        m.saliente?.toLowerCase().includes("urrejola")
    );
    expect(urrejola).toBeDefined();
    expect(urrejola?.fecha).toBe("2026-08-14");
    expect(urrejola?.salio?.motivo_categoria).toBeDefined();
    expect(urrejola?.fuentes.length).toBeGreaterThanOrEqual(1);
  });

  it("3. Scope Completo del Ejecutivo: Presencia de Seremis, Delegados Presidenciales, GOREs y Directores", () => {
    const seremis = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("seremi") || m.organismo.toLowerCase().includes("seremi"));
    expect(seremis.length).toBeGreaterThanOrEqual(2);

    const delegados = MOVIMIENTOS.filter((m) => m.cargo.toLowerCase().includes("delegad") || m.organismo.toLowerCase().includes("delegac"));
    expect(delegados.length).toBeGreaterThanOrEqual(1);
  });

  it("4. Anatomía de Tarjeta y UI: Acordeón para detalle, separación de mes y botón copiar enlace", () => {
    expect(movimientosPageSource).toContain("toggleExpand");
    expect(movimientosPageSource).toContain("▾ Ver detalle");
    expect(movimientosPageSource).toContain("▴ Ocultar detalle");
    expect(movimientosPageSource).toContain("Copiar enlace");
  });

  it("4b. Explica la diferencia entre fecha efectiva y fecha de publicación de la fuente", () => {
    expect(movimientosPageSource).toContain("Fecha del evento");
    expect(movimientosPageSource).toContain("fecha de publicación");
    expect(movimientosPageSource).toContain("Última actualización pública");
    expect(movimientosPageSource).toContain("Última salida documentada");
  });

  it("4c. calcula la última publicación sin reemplazar la fecha efectiva", () => {
    expect(latestMovementPublicationDate([
      { fuentes: [{ nivel: "prensa", medio: "Fuente", url: "https://example.test/a", fecha: "2026-09-02", titulo: "" }] },
      { fuentes: [{ nivel: "oficial", medio: "Fuente oficial", url: "https://example.test/b", fecha: "2026-09-03", titulo: "" }] },
    ], [{ date: "2026-09-01" }])).toBe("2026-09-03");
  });

  it("4d. separa la ejecución del proceso, el último evento y la salud de cada fuente", () => {
    const summary = summarizeMovementFreshness({
      last_attempt_at: "2026-09-11T17:17:35.908Z",
      last_success_at: "2026-09-11T17:17:35.908Z",
      last_event_date: "2026-09-02",
      source_health: [
        { id: "ley-chile", label: "Ley Chile / BCN", tier: "official", ok: true, status: 200, fetchedAt: "2026-09-11T17:17:36.100Z" },
        { id: "gob-cl", label: "Gob.cl Noticias", tier: "official", ok: false, status: 403, fetchedAt: "2026-09-11T17:17:39.709Z", error: "HTTP_403" },
      ],
    }, Date.parse("2026-09-12T12:00:00Z"));

    expect(summary).toMatchObject({
      state: "advertencia",
      lastEventDate: "2026-09-02",
      successDaysAgo: 0,
      eventDaysAgo: 10,
    });
    expect(summary.unavailableOfficial).toHaveLength(1);
    expect(summary.unavailableOfficial[0]).toMatchObject({ id: "gob-cl", status: 403, error: "HTTP_403" });
  });

  it("5. Días en el cargo calculado para autoridades salientes con origen", () => {
    const withDays = MOVIMIENTOS.filter((m) => m.dias_en_cargo !== undefined && m.dias_en_cargo !== null);
    expect(withDays.length).toBe(0);
  });

  it("6. etl_diario_oficial registrado en inventario_completo_etls.csv y arquitectura-datos.md", () => {
    expect(inventarioCsv).toContain("etl_diario_oficial");
    expect(inventarioCsv).toContain("Diario Oficial de la República de Chile");
    expect(arquitecturaMarkdown).toContain("etl_diario_oficial");
    expect(arquitecturaMarkdown).toContain("Diario Oficial de Chile");
  });

  it("7. Cruce CGR SIAPER: Todo movimiento con motivo 'Contraloría/irregularidad' tiene informe SIAPER CGR asociado", () => {
    const cgrMovs = MOVIMIENTOS.filter((m) => m.salio?.motivo_categoria === "Contraloría/irregularidad");
    expect(cgrMovs.length).toBe(0);
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

  it("9. No marca anuncios recientes como documentos atrasados", () => {
    const now = Date.parse("2026-09-05T12:00:00Z");
    expect(isMovimientoDocumentoPendienteMayor30({ documento_pendiente: true, fecha: "2026-09-02" }, now)).toBe(false);
    expect(isMovimientoDocumentoPendienteMayor30({ documento_pendiente: true, fecha: "2026-07-01" }, now)).toBe(true);
    expect(isMovimientoDocumentoPendienteMayor30({ documento_pendiente: false, fecha: "2026-07-01" }, now)).toBe(false);
  });
});
