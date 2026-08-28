export interface VotacionConTitulo {
  titulo: string;
  boletin: string;
}

/** Make generic boletin titles understandable without inventing a project name. */
export function tituloVotacionLegible(
  entry: VotacionConTitulo,
  tipo?: string | null,
): string {
  if (!/^Votación registrada del Boletín/u.test(entry.titulo)) return entry.titulo;
  return `${tipo || "Votación de proyecto"} · Boletín N° ${entry.boletin}`;
}
