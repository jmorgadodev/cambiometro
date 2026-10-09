/** Decisiones de presentación. No certifican cobertura ni exactitud absoluta. */
export type IndicatorPublicationState = "respaldado" | "cobertura_limitada" | "en_revision";
export const PUBLICATION_STATE_LABELS: Record<IndicatorPublicationState, string> = {
  respaldado: "Respaldado para el alcance declarado",
  cobertura_limitada: "Cobertura limitada",
  en_revision: "En revisión",
};

export const PUBLICATION_SCOPES = {
  home: "Las cifras describen el catálogo integrado, no toda la información pública de Chile ni personas únicas. Cada fuente conserva sus períodos y limitaciones.",
  movimientos: "Se cuentan anuncios documentados y salidas reportadas; no todos tienen confirmación legal. Un comunicado o una noticia no sustituye el acto administrativo. La documentación posterior actualiza el mismo caso.",
  votaciones: "Se muestran las votaciones incorporadas por cámara y fecha. No se acredita que estén integradas todas las sesiones recientes. Voto emitido, abstención, presencia sin votar y ausencia son categorías distintas.",
  politico: "Los componentes conservan sus meses publicados, que pueden diferir. Gasto rendido y personal de apoyo no son sueldo del parlamentario. Un registro histórico no acredita cargo ni afiliación actuales.",
  partidos: "Los agregados usan la bancada del catálogo consultado, no una afiliación acreditada para cada voto histórico. Los cortes entre cámaras pueden diferir; no son una comparación de períodos necesariamente equivalentes.",
  gastos: "Son rendiciones de los meses publicados, no asignaciones máximas ni remuneraciones personales. Un mes sin filas significa sin registro observado, no gasto cero.",
  remuneraciones: "Son registros publicados por fuente, organismo y período. Un monto informado no acredita una mensualidad completa ni una autoridad vigente. Cero, monto no informado y ausencia de registro se mantienen separados.",
  municipalidades: "Titular documentado y pago histórico son datos diferentes. Presupuesto inicial, vigente y ejecución no son equivalentes; cada cifra conserva año y unidad. Las comprobaciones muestrales no certifican todas las nóminas municipales.",
  servicios: "La ficha reúne los registros integrados del organismo. Presupuesto, ejecución y remuneraciones tienen unidades y períodos propios; un agregado institucional no es un pago personal.",
  transferencias: "El conjunto integrado de transferencias no acredita todo el universo nacional ni todos los meses. Se conserva el organismo, período y registro de origen; un beneficiario puede tener varios registros.",
  entidades: "Una ficha documental no acredita por sí sola identidad entre homónimos, influencia, conflicto de interés ni irregularidad. ChileCompra conserva su corte integrado, sin prometer cobertura anual completa.",
  cruces: "Un vínculo por identificador y documento puede describir registros relacionados; una coincidencia de nombre o fecha es sólo una posible relación. No demuestra causalidad, influencia ni irregularidad.",
  personas: "La evidencia disponible se presenta por fuente y período. Una coincidencia de nombre no basta para afirmar que dos registros corresponden a la misma persona ni que ejerce hoy ese cargo.",
  rankings: "La comparación se limita a la elección, indicador y registros publicados. La falta de datos no equivale a cero; un ranking no permite comparar cortes o denominadores distintos como si fueran equivalentes.",
  comparar: "Compare sólo el mismo indicador, período y unidad. Una diferencia entre coberturas no prueba una diferencia real de desempeño o gasto; un componente faltante impide un total completo.",
  calculadora: "Los escenarios son simulaciones bajo los supuestos indicados, no gasto ejecutado ni ahorro comprobado. Los componentes no publicados no se completan por inferencia.",
  datos: "Fuente oficial no significa conjunto completo. Sin universo de referencia defendible, la cobertura se considera no medida. Una versión consultable no certifica todos sus registros originales.",
  buscar: "Se busca en los registros integrados, no en todo el universo oficial. Las fichas mantienen fuentes separadas cuando la identidad no está acreditada; una búsqueda vacía no prueba inexistencia.",
} as const;
export type PublicationScopeArea = keyof typeof PUBLICATION_SCOPES;

// No publicar estadísticas de bancada desde un fixture fuera del ReleaseSet.
// Activar sólo tras comprobar su receta, entradas, períodos y pertenencia temporal.
export const PARTY_AGGREGATES_REVIEWED = false;

export function formatPublicIndicator(value: number | null | undefined, state: IndicatorPublicationState, format: (value: number) => string): string {
  if (state === "en_revision") return PUBLICATION_STATE_LABELS.en_revision;
  return value === null || value === undefined || !Number.isFinite(value) ? "No informado" : format(value);
}
