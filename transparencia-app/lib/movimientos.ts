/**
 * Contrato de Movimientos para la interfaz estática.
 *
 * El contenido se importa desde data/movimientos.json para que el build de
 * Pages consuma el snapshot que el ETL acaba de hidratar desde R2. El archivo
 * no contiene un catálogo duplicado ni datos generados manualmente.
 */
import movimientosData from "../data/movimientos.json";

export type MovimientoTipo =
  | "renuncia" | "cese" | "remocion" | "cambio" | "cambio-puesto"
  | "enroque" | "cambio-mando" | "reasuncion" | "nombramiento"
  | "designacion" | "confirmacion" | "creacion" | "fallido" | "nombramiento-fallido";

export type MovimientoNivelFuente = "oficial" | "semioficial" | "prensa" | "senal_tercero";
export type MovimientoEstado = "verificado" | "verificado_oficial" | "corroborado" | "detectado" | "en_confirmacion";
export type MovimientoMotivoCategoria =
  | "No informado" | "Renuncia pedida por el Gobierno" | "Remoción"
  | "Contraloría/irregularidad" | "Conflictos internos" | "Conductas indebidas"
  | "Cambio dentro del gobierno" | "Cuestionamiento de gestión" | "Fin de período";

export interface MovimientoFuente {
  nivel: MovimientoNivelFuente;
  medio: string;
  url: string;
  fecha: string;
  titulo: string;
}

export interface MovimientoCgrInforme { numero: string; titulo: string; url: string; }

export interface MovimientoSaliente {
  nombre: string;
  fecha: string;
  fecha_inicio?: string;
  dias_en_cargo?: number | null;
  dias_en_cargo_origen?: "oficial" | "estimado";
  motivo_categoria: MovimientoMotivoCategoria;
  motivo_texto: string;
}

export interface MovimientoEntrante { nombre: string; fecha: string; }

export interface Movimiento {
  id: string;
  tipo_evento: MovimientoTipo;
  cargo: string;
  organismo: string;
  ministerio: string;
  region: string;
  salio?: MovimientoSaliente;
  entro?: MovimientoEntrante;
  cgr_informe?: MovimientoCgrInforme;
  dias_en_cargo?: number | null;
  dias_en_cargo_origen?: "oficial" | "estimado";
  decreto_url?: string;
  id_norma?: string;
  decreto_numero?: string;
  detectado_por?: string;
  documento_pendiente?: boolean;
  fuentes: MovimientoFuente[];
  estado: MovimientoEstado;
  fecha_deteccion: string;
  fecha_verificacion: string | null;
  fecha: string;
  fechaExacta: boolean;
  tipo: MovimientoTipo;
  organo: string;
  saliente?: string;
  entrante?: string;
  motivo: string;
  fuente?: string;
  verificado: boolean;
}

export interface MovimientoSignal {
  signal_id: string;
  source_id: string;
  source_label: string;
  source_tier: "official" | "provisional";
  title: string;
  url: string | null;
  date: string | null;
  summary: string;
  detected_at: string;
  fase: "anunciado";
  status: "en_confirmacion";
  tipo: MovimientoTipo;
}

export interface MovimientosPayload {
  version: string;
  pipeline: "etl_movimientos_autoridades";
  last_run: string;
  last_attempt_at?: string;
  last_success_at?: string;
  last_event_date?: string | null;
  frecuencia: string;
  stats: Record<string, number>;
  source_health?: Array<Record<string, unknown>>;
  signals?: MovimientoSignal[];
  movimientos: Movimiento[];
  checksum_sha256?: string;
  [key: string]: unknown;
}

export const MOTIVOS_CATEGORIAS: MovimientoMotivoCategoria[] = [
  "No informado", "Renuncia pedida por el Gobierno", "Remoción", "Contraloría/irregularidad",
  "Conflictos internos", "Conductas indebidas", "Cambio dentro del gobierno",
  "Cuestionamiento de gestión", "Fin de período",
];

export const MOVIMIENTOS_TIPO_LABEL: Record<MovimientoTipo, string> = {
  renuncia: "Renuncia", cese: "Cese", remocion: "Remoción", cambio: "Cambio de puesto",
  "cambio-puesto": "Cambio de puesto", enroque: "Enroque", "cambio-mando": "Cambio de mando",
  reasuncion: "Reasunción", nombramiento: "Nombramiento", designacion: "Designación",
  confirmacion: "Confirmación", creacion: "Creación", fallido: "Nombramiento fallido",
  "nombramiento-fallido": "Nombramiento fallido",
};

export const MOVIMIENTOS_TIPO_COLOR: Record<MovimientoTipo, string> = {
  renuncia: "var(--alert)", cese: "var(--alert)", remocion: "var(--alert)",
  cambio: "var(--info)", "cambio-puesto": "var(--info)", enroque: "var(--info)",
  "cambio-mando": "var(--info)", reasuncion: "var(--info)", nombramiento: "var(--ok)",
  designacion: "var(--ok)", confirmacion: "var(--ok)", creacion: "var(--ok)",
  fallido: "var(--text-muted)", "nombramiento-fallido": "var(--text-muted)",
};

export const MOVIMIENTOS_TIPO_EMOJI: Record<MovimientoTipo, string> = {
  renuncia: "🚪", cese: "🚫", remocion: "🚫", cambio: "🔀", "cambio-puesto": "🔀",
  designacion: "✅", nombramiento: "✅", reasuncion: "🔄", confirmacion: "🔒",
  "cambio-mando": "🏛️", creacion: "🆕", enroque: "🔀", fallido: "⚠️",
  "nombramiento-fallido": "⚠️",
};

const payload = movimientosData as unknown as MovimientosPayload;
export const MOVIMIENTOS: Movimiento[] = payload.movimientos;
export const MOVIMIENTOS_PIPELINE_METADATA = {
  last_run: payload.last_run,
  last_attempt_at: payload.last_attempt_at,
  last_success_at: payload.last_success_at,
  last_event_date: payload.last_event_date,
  frecuencia: payload.frecuencia,
  stats: payload.stats,
  source_health: payload.source_health ?? [],
  signals: payload.signals ?? [],
};

export const MOVIMIENTO_DOCUMENTO_PENDIENTE_DIAS = 30;

/**
 * A provisional announcement can be pending an official act for any length
 * of time. The >30d warning is only valid after thirty calendar days from
 * the event date; recent announcements must not be presented as overdue.
 */
export function isMovimientoDocumentoPendienteMayor30(
  movimiento: Pick<Movimiento, "documento_pendiente" | "fecha">,
  nowMs = Date.now(),
): boolean {
  if (!movimiento.documento_pendiente) return false;
  const eventMs = Date.parse(`${movimiento.fecha.slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(eventMs)
    && nowMs - eventMs >= MOVIMIENTO_DOCUMENTO_PENDIENTE_DIAS * 86_400_000;
}

/**
 * Resumen editorial de la Home, calculado desde el mismo snapshot que usa
 * /movimientos. La fecha de inicio del gobierno es parte del corte
 * metodológico; los conteos nunca se escriben a mano en la página.
 */
export const MOVIMIENTOS_GOBIERNO_DESDE = "2026-03-11";

const movimientosGobierno = MOVIMIENTOS.filter((movement) => movement.fecha >= MOVIMIENTOS_GOBIERNO_DESDE);
const esVerificado = (movement: Movimiento) => ["verificado", "verificado_oficial", "corroborado"].includes(movement.estado);
const esRenuncia = (movement: Movimiento) => movement.tipo_evento === "renuncia" || movement.tipo === "renuncia";
const fechaComoDiaUtc = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
const ultimoEvento = movimientosGobierno.reduce((latest, movement) => movement.fecha > latest ? movement.fecha : latest, "");
const ultimoCorte = payload.last_run?.slice(0, 10) ?? ultimoEvento;
const diasSinCambios = Number.isFinite(fechaComoDiaUtc(ultimoCorte)) && Number.isFinite(fechaComoDiaUtc(ultimoEvento))
  ? Math.max(0, Math.round((fechaComoDiaUtc(ultimoCorte) - fechaComoDiaUtc(ultimoEvento)) / 86_400_000))
  : 0;

export const MOVIMIENTOS_HOME_SUMMARY = {
  desde: MOVIMIENTOS_GOBIERNO_DESDE,
  total: movimientosGobierno.length,
  renuncias: movimientosGobierno.filter(esRenuncia).length,
  verificados: movimientosGobierno.filter(esVerificado).length,
  enConfirmacion: movimientosGobierno.filter((movement) => movement.estado === "en_confirmacion").length,
  ultimoEvento,
  ultimoCorte,
  diasSinCambios,
} as const;
