import type { EtlRecord } from "./data-source";
import type { ConteoOpciones, FilaVotacionPartido, PartidoEstadistica } from "./partido-estadisticas";
import { resumirGastosAgregables } from "./gastos-operacionales";
import { officialSessionMetadata } from "./session-integrity";
import { unreconciledNominalSessions } from "./vote-publication-integrity";

type Member = { id: string; nombre_completo: string; cargo: string };
type Source = { sessions: Record<string, EtlRecord>; votes: Record<string, [string, string][]> };
export interface PartyPublication {
  scope: "catalogue-members";
  votingPeriods: Record<"camara" | "senado", { from: string; to: string } | null>;
  expensePeriods: string[];
  excludedVotes: number;
}

function tally(rows: string[]): ConteoOpciones {
  const count = (option: string) => rows.filter((row) => row === option).length;
  const afirmativo = count("Afirmativo"), enContra = count("En Contra"), abstencion = count("Abstención");
  const noVota = count("No Vota"), dispensado = count("Dispensado") + count("Pareo");
  const emitidos = afirmativo + enContra + abstencion;
  const apariciones = rows.length;
  const pct = (n: number, d: number) => d > 0 ? Math.round(n / d * 1000) / 10 : 0;
  return { afirmativo, enContra, abstencion, noVota, dispensado, emitidos, apariciones,
    asistencia: pct(emitidos, apariciones), pctSi: pct(afirmativo, emitidos), pctNo: pct(enContra, emitidos),
    pctAbst: pct(abstencion, emitidos), pctNoVota: pct(noVota, apariciones) };
}

/** Agrupa miembros del catálogo, NO acredita militancia histórica ni asistencia a sala. */
export function buildPublishedPartyStats(
  members: readonly Member[], source: Source, expenses: Record<string, EtlRecord[]>,
): PartidoEstadistica & { publication: PartyPublication } {
  const rejected = unreconciledNominalSessions(source);
  const bySession = new Map<string, NonNullable<FilaVotacionPartido["votosNominales"]>>();
  const options: Record<"camara" | "senado", string[]> = { camara: [], senado: [] };
  let excludedVotes = 0;
  for (const member of members) {
    const seen = new Set<string>();
    for (const [id, option] of source.votes[member.id] ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      const session = source.sessions[id];
      const chamber = member.cargo === "Senador" ? "senado" : "camara";
      if (!session || rejected.has(id) || session.fuente !== chamber ||
          !["Afirmativo", "En Contra", "Abstención", "No Vota", "Dispensado", "Pareo"].includes(option)) {
        excludedVotes++;
        continue;
      }
      options[chamber].push(option);
      const nominal = bySession.get(id) ?? [];
      nominal.push({ politico_id: member.id, nombre: member.nombre_completo, opcion: option });
      bySession.set(id, nominal);
    }
  }
  const votingPeriods: PartyPublication["votingPeriods"] = { camara: null, senado: null };
  const dates = new Map<string, { present: number; total: number }>();
  const votaciones: FilaVotacionPartido[] = [...bySession.entries()].map(([id, nominal]) => {
    const session = source.sessions[id];
    const meta = officialSessionMetadata({ ...session, url_tramitacion: session.url_tramitacion ?? session.url });
    const counts = tally(nominal.map((row) => row.opcion));
    if (meta.fecha) {
      const chamber = session.fuente as "camara" | "senado";
      const previous = votingPeriods[chamber];
      votingPeriods[chamber] = { from: previous && previous.from < meta.fecha ? previous.from : meta.fecha,
        to: previous && previous.to > meta.fecha ? previous.to : meta.fecha };
      const day = dates.get(meta.fecha) ?? { present: 0, total: 0 };
      day.present += counts.emitidos;
      day.total += counts.apariciones;
      dates.set(meta.fecha, day);
    }
    return { id, ...meta, si: counts.afirmativo, no: counts.enContra, abst: counts.abstencion,
      noVota: counts.noVota + counts.dispensado, apariciones: counts.apariciones, pctSi: counts.pctSi, votosNominales: nominal };
  }).sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || b.id.localeCompare(a.id));
  const monthly = new Map<string, number>(), items = new Map<string, number>();
  const coverage = new Map<string, number>();
  const porPolitico = members.flatMap((member) => {
    const summary = resumirGastosAgregables((expenses[member.id] ?? []).filter((row) =>
      String(row.periodo ?? row.fecha?.slice(0, 7) ?? "") >= "2026-03"));
    if (summary.porMes.length === 0) return [];
    for (const row of summary.porMes) {
      monthly.set(row.periodo, (monthly.get(row.periodo) ?? 0) + row.total);
      coverage.set(row.periodo, (coverage.get(row.periodo) ?? 0) + 1);
    }
    for (const row of summary.porItem) items.set(row.item, (items.get(row.item) ?? 0) + row.total);
    return [{ politico_id: member.id, nombre: member.nombre_completo, cargo: member.cargo, total: summary.total }];
  });
  const porMes = [...monthly].sort(([a], [b]) => a.localeCompare(b)).map(([periodo, total]) => ({ periodo, total, parlamentarios: coverage.get(periodo) ?? 0 }));
  return {
    votosCamara: tally(options.camara), votosSenado: tally(options.senado), votaciones,
    asistencia: [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, day], i) => ({
      sesion: String(i + 1), fecha, asistencia: Math.round(day.present / day.total * 1000) / 10,
      presentes: day.present, total: day.total,
    })),
    gastos: { total: porMes.reduce((sum, row) => sum + row.total, 0), porMes,
      porItem: [...items].map(([item, total]) => ({ item, total })).sort((a, b) => b.total - a.total),
      porPolitico: porPolitico.sort((a, b) => b.total - a.total) },
    publication: { scope: "catalogue-members", votingPeriods, expensePeriods: porMes.map((row) => row.periodo), excludedVotes },
  };
}
