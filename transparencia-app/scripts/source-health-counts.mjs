/**
 * Cuenta el alcance de cada fuente desde el catálogo de particiones.
 *
 * Los catálogos antiguos sólo tenían un registro agregado por fuente, mientras
 * que los releases nuevos pueden separar variantes (asistencia, votaciones,
 * datos abiertos, etc.). Estas funciones aceptan ambas formas para que el ETL
 * local no vuelva a sumar categorías distintas como si fueran una sola.
 */

const asRecords = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function sourceRecordCount(catalog, sourceId) {
  const partitions = Array.isArray(catalog?.partitions)
    ? catalog.partitions.filter((partition) => partition?.sourceId === sourceId)
    : [];
  if (partitions.length) return partitions.reduce((sum, partition) => sum + asRecords(partition.recordCount), 0);

  const source = Array.isArray(catalog?.sources)
    ? catalog.sources.find((item) => item?.id === sourceId)
    : null;
  return asRecords(source?.recordCount);
}

export function variantRecordCount(catalog, sourceId, variantId) {
  const partitions = Array.isArray(catalog?.partitions)
    ? catalog.partitions.filter((partition) =>
      (partition?.sourceId === sourceId && partition?.variant === variantId) || partition?.sourceId === variantId,
    )
    : [];
  if (partitions.length) return partitions.reduce((sum, partition) => sum + asRecords(partition.recordCount), 0);

  return sourceRecordCount(catalog, variantId);
}

export function buildParliamentSourceHealth(catalog) {
  const camara = {
    recordCount: sourceRecordCount(catalog, "camara"),
    components: {
      asistencia: variantRecordCount(catalog, "camara", "asistencia_camara"),
      votaciones: variantRecordCount(catalog, "camara", "votaciones_camara"),
      datosAbiertos: variantRecordCount(catalog, "camara", "congreso_opendata"),
      gastos: sourceRecordCount(catalog, "gastos_camara"),
    },
  };
  const senado = {
    recordCount: sourceRecordCount(catalog, "senado"),
    components: {
      votaciones: sourceRecordCount(catalog, "votaciones_senado"),
      gastos: sourceRecordCount(catalog, "gastos_senado"),
    },
  };
  return { camara, senado };
}
