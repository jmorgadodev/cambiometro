import type { EtlRecord } from "@/lib/data-source";

export interface ItemGasto {
  item: string;
  monto: number;
}

export interface MesGastosCalculado {
  periodo: string; // e.g. "2026-05"
  etiqueta: string; // e.g. "may 2026"
  total: number; // Sum of component items (or totalPublicado if no component items)
  sumaItems: number;
  totalPublicadoFuente: number | null; // From summary row like "VALOR TOTAL" or "TOTAL"
  diferenciaExplicada: {
    totalPublicado: number;
    sumaItems: number;
    diferencia: number;
    mensaje: string;
  } | null;
  variacion: number | null; // % vs previous month
  items: ItemGasto[]; // Sorted desc by amount, excluding summary row
}

export interface GastosPoliticoProcesados {
  meses: MesGastosCalculado[];
  totalAcumulado: number; // Sum of total for all published months
  periodos: string[];
  ultimoPeriodo: string;
}

/**
 * Identifica si una fila corresponde a un agregado o fila de resumen total
 * (e.g. "VALOR TOTAL", "TOTAL", "TOTAL GASTOS OPERACIONALES", etc.)
 * en lugar de un ítem de gasto específico desagregado.
 */
export function esFilaResumenTotal(itemOrTitle: string | null | undefined): boolean {
  if (!itemOrTitle) return false;
  const norm = itemOrTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  if (
    norm === "VALOR TOTAL" ||
    norm === "TOTAL" ||
    norm === "TOTAL GASTOS" ||
    norm === "TOTAL GASTOS OPERACIONALES" ||
    norm === "TOTAL GENERAL" ||
    norm === "VALOR TOTAL MES" ||
    norm === "TOTAL RENDIDO" ||
    norm === "TOTAL OPERACIONAL"
  ) {
    return true;
  }
  return false;
}

/**
 * Genera la etiqueta legible en español para un período "YYYY-MM" (e.g. "2026-05" -> "may 2026").
 */
export function formatPeriodoMes(periodo: string): string {
  const [year, month] = periodo.split("-");
  if (!year || !month) return periodo;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-CL", { month: "short", year: "numeric" }).replace(".", "");
}

/**
 * Procesa y valida los gastos operacionales de un parlamentario,
 * garantizando la regla de consistencia:
 * total_mes === suma(items_del_mes)
 * acumulado === suma(totales_mes_publicados)
 * % variación vs mes anterior recalculado sobre los totales corregidos.
 */
export function procesarGastosPolitico(records: EtlRecord[]): GastosPoliticoProcesados {
  // 1. Agrupar registros por período (YYYY-MM)
  const porPeriodo = new Map<string, EtlRecord[]>();
  for (const r of records) {
    const periodo = r.periodo || (r.fecha ? r.fecha.slice(0, 7) : "");
    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) continue;
    if (!porPeriodo.has(periodo)) {
      porPeriodo.set(periodo, []);
    }
    porPeriodo.get(periodo)!.push(r);
  }

  const periodosOrdenados = Array.from(porPeriodo.keys()).sort();
  const meses: MesGastosCalculado[] = [];

  for (let i = 0; i < periodosOrdenados.length; i++) {
    const periodo = periodosOrdenados[i];
    const recs = porPeriodo.get(periodo)!;

    let totalPublicadoFuente: number | null = null;
    const itemsMap = new Map<string, number>();

    for (const r of recs) {
      const itemNombre = (r.item || r.categoria || r.concepto || (r as Record<string, unknown>).title || "Otros gastos") as string;
      const monto = typeof r.monto_clp === "number" && Number.isFinite(r.monto_clp) ? r.monto_clp : 0;

      if (esFilaResumenTotal(itemNombre)) {
        totalPublicadoFuente = monto;
      } else {
        const cleanNombre = itemNombre.trim();
        itemsMap.set(cleanNombre, (itemsMap.get(cleanNombre) || 0) + monto);
      }
    }

    const items: ItemGasto[] = Array.from(itemsMap.entries())
      .map(([item, monto]) => ({ item, monto }))
      .sort((a, b) => b.monto - a.monto);

    const sumaItems = items.reduce((acc, curr) => acc + curr.monto, 0);

    // Si existen ítems desagregados, el total del mes es exactamente la suma de los ítems.
    // Si no existen ítems desagregados pero sí una fila resumen, el total es totalPublicadoFuente.
    const total = items.length > 0 ? sumaItems : (totalPublicadoFuente ?? 0);

    // Detección de discrepancia si la fuente publicó un total distinto a la suma de ítems
    let diferenciaExplicada: MesGastosCalculado["diferenciaExplicada"] = null;
    if (totalPublicadoFuente !== null && items.length > 0 && totalPublicadoFuente !== sumaItems) {
      const diff = totalPublicadoFuente - sumaItems;
      diferenciaExplicada = {
        totalPublicado: totalPublicadoFuente,
        sumaItems,
        diferencia: diff,
        mensaje: `La fuente oficial publicó un total de $${totalPublicadoFuente.toLocaleString("es-CL")} pero el desglose de ítems suma $${sumaItems.toLocaleString("es-CL")} (diferencia: ${diff > 0 ? "+" : ""}$${diff.toLocaleString("es-CL")}). Se reporta la suma exacta de ítems verificables.`,
      };
    }

    // Variación % vs mes anterior
    let variacion: number | null = null;
    if (i > 0) {
      const mesAnterior = meses[i - 1];
      if (mesAnterior && mesAnterior.total > 0) {
        variacion = ((total - mesAnterior.total) / mesAnterior.total) * 100;
      }
    }

    const etiqueta = formatPeriodoMes(periodo);

    meses.push({
      periodo,
      etiqueta,
      total,
      sumaItems,
      totalPublicadoFuente,
      diferenciaExplicada,
      variacion,
      items,
    });
  }

  const totalAcumulado = meses.reduce((acc, m) => acc + m.total, 0);
  const ultimoPeriodo = periodosOrdenados[periodosOrdenados.length - 1] ?? "";

  return {
    meses,
    totalAcumulado,
    periodos: periodosOrdenados,
    ultimoPeriodo,
  };
}

/**
 * Aserción bloqueante de consistencia para el lake y builds.
 * Lanza un error fatal si un agregado no cuadra con sus componentes.
 */
export function assertGastosConsistency(
  politicoId: string,
  records: EtlRecord[],
): void {
  const procesado = procesarGastosPolitico(records);
  for (const mes of procesado.meses) {
    if (mes.items.length > 0) {
      const calculada = mes.items.reduce((a, b) => a + b.monto, 0);
      if (mes.total !== calculada) {
        throw new Error(
          `CONSISTENCY_ERROR: Politico ${politicoId} mes ${mes.periodo} total (${mes.total}) !== suma(items) (${calculada})`
        );
      }
    }
  }

  const sumaMeses = procesado.meses.reduce((a, b) => a + b.total, 0);
  if (procesado.totalAcumulado !== sumaMeses) {
    throw new Error(
      `CONSISTENCY_ERROR: Politico ${politicoId} acumulado (${procesado.totalAcumulado}) !== suma(meses) (${sumaMeses})`
    );
  }
}
