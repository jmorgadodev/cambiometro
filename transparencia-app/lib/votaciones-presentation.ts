type VoteRow = { votacion: { id: string; fecha?: string } };

/** Merge a stored profile slice with the current canonical index; current rows win on ID. */
export function mergePoliticianVoteRows<T extends VoteRow>(stored: T[], current: T[]): T[] {
  const byId = new Map<string, T>();
  let anonymous = 0;

  for (const row of stored) {
    byId.set(row.votacion.id ? `id:${row.votacion.id}` : `stored:${anonymous++}`, row);
  }
  for (const row of current) {
    byId.set(row.votacion.id ? `id:${row.votacion.id}` : `current:${anonymous++}`, row);
  }

  return [...byId.values()].sort((a, b) => (b.votacion.fecha ?? "").localeCompare(a.votacion.fecha ?? ""));
}

export function latestAvailableVoteDate(rows: Array<{ fecha?: string; votacion?: { fecha?: string } }>): string | null {
  return rows.reduce<string | null>((latest, row) => {
    const date = row.votacion?.fecha ?? row.fecha ?? "";
    return /^\d{4}-\d{2}-\d{2}$/u.test(date) && (!latest || date > latest) ? date : latest;
  }, null);
}

export function tituloVotacionPerfilLegible(
  description: string | null | undefined,
  type: string | null | undefined,
  bulletin: string | null | undefined,
): string {
  const raw = (description ?? "").trim();
  if (/^\d+-/u.test(raw) || raw.toLowerCase().includes("1-otros")) return "Votación de procedimiento de Sala";

  const generic = !raw || raw.length < 10 || /^(decreto|oficio|archivo|proyecto de ley|resolución|proyecto de acuerdo|informe)\s*$/iu.test(raw) || /^votación registrada del boletín/iu.test(raw);
  if (generic) {
    if (!bulletin) return "Materia no catalogada — consulta el registro oficial";
    const kind = `${type ?? ""} ${raw}`.toLocaleLowerCase("es-CL");
    const label = kind.includes("resolución")
      ? "Proyecto de Resolución"
      : kind.includes("acuerdo")
        ? "Proyecto de Acuerdo"
        : kind.includes("ley")
          ? "Proyecto de Ley"
          : (type?.trim() || "Votación de proyecto");
    return `${label} · Boletín N° ${bulletin}`;
  }

  if (raw.length > 120) {
    const firstSentence = raw.split(/[.;]/u)[0].trim();
    if (firstSentence.length >= 20 && firstSentence.length <= 120) {
      return firstSentence.charAt(0).toLocaleUpperCase("es-CL") + firstSentence.slice(1).toLocaleLowerCase("es-CL");
    }
    return `${raw.slice(0, 118).trim()}…`;
  }
  return raw;
}

function isOfficialHost(value: string | null | undefined, domain: string): boolean {
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === domain || hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export function getReadableOfficialVoteUrl(
  corporation: "Cámara" | "Senado",
  sourceUrl?: string | null,
  processingUrl?: string | null,
): string | null {
  if (corporation === "Cámara") return "https://www.camara.cl/legislacion/sala_sesiones/votaciones.aspx";
  if (isOfficialHost(processingUrl, "senado.cl")) return processingUrl!;
  if (isOfficialHost(sourceUrl, "senado.cl")) return sourceUrl!;
  return null;
}
