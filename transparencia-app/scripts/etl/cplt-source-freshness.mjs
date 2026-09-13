export const CPLT_SOURCES = [
  { sourceId: "cplt-personal-planta", fileName: "TA_PersonalPlanta.csv" },
  { sourceId: "cplt-personal-contrata", fileName: "TA_PersonalContrata.csv" },
  { sourceId: "cplt-personal-honorarios", fileName: "TA_PersonalContratohonorarios.csv" },
  { sourceId: "cplt-personal-codigotrabajo", fileName: "TA_PersonalCodigotrabajo.csv" },
];

export const CPLT_SOURCE_BASES = [
  "https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos",
  "https://www.cplt.cl/transparencia_activa/datoabierto/archivos",
];

export function sourceUrls(source) {
  return CPLT_SOURCE_BASES.map((base) => `${base}/${source.fileName}`);
}

export function currentSourceValidator(response) {
  return response.headers.get("etag") || response.headers.get("last-modified") || null;
}

export function compareCpltSourceValidators(previousSources, currentSources) {
  const previousById = new Map((previousSources ?? []).map((source) => [source.sourceId, source]));
  return currentSources.map((source) => {
    const previous = previousById.get(source.sourceId);
    return {
      sourceId: source.sourceId,
      validator: source.validator,
      previousValidator: previous?.sourceValidator ?? null,
      changed: !previous || !previous.sourceValidator || previous.sourceValidator !== source.validator,
    };
  });
}
