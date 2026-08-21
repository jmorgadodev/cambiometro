interface SessionMetadataInput {
  fecha?: unknown;
  descripcion?: unknown;
  nombre?: unknown;
  tramite?: unknown;
  resultado?: unknown;
  url_tramitacion?: unknown;
}

function officialText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

/** R10: una ausencia oficial permanece null; no se rellena con texto ni fechas de conveniencia. */
export function officialSessionMetadata(input: SessionMetadataInput) {
  const rawDate = officialText(input.fecha);
  return {
    fecha: rawDate ? rawDate.slice(0, 10) : null,
    descripcion: officialText(input.descripcion) ?? officialText(input.nombre),
    tramite: officialText(input.tramite),
    resultado: officialText(input.resultado),
    url_tramitacion: officialText(input.url_tramitacion),
  };
}
