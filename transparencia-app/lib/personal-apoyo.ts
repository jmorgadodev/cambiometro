import fs from "fs";
import path from "path";
import type { CanonicalEntity, EvidenceRecord } from "@/lib/data-contracts";

export interface FilaPersonalApoyo {
  tipo: string;
  nombre: string;
  cargo: string;
  sueldo: number;
  cargo_servel?: string;
  cese?: string;
}

export interface FichaCamara {
  comunas_distrito: string | null;
  numero_distrito: number | null;
  region: string | null;
  periodo: string | null;
  partido: string | null;
  bancada: string | null;
  foto: string | null;
  redes: Partial<Record<"x" | "facebook" | "instagram", string>>;
}

export interface DiputadoPersonalApoyo {
  meses: { num: string; nombre: string }[];
  mes_personal: string;
  ficha: FichaCamara;
  personal_apoyo: FilaPersonalApoyo[];
}

export interface RegistroSenadorPersonalApoyo {
  ano: number;
  mes: number;
  apellido_paterno: string;
  apellido_materno: string;
  nombre: string;
  cargo: string;
  monto: number;
  calidad_juridica: string;
  periodo: string;
}

export interface PersonalApoyoDataset {
  generado_en: string;
  fuentes: Record<string, { url: string; nota: string }>;
  meses_senado_disponibles: string[];
  diputados: Record<string, DiputadoPersonalApoyo>;
  senadores: Record<string, RegistroSenadorPersonalApoyo[]>;
}

const MONTHS: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function sameNameTokens(left: string, right: string) {
  const tokens = (value: string) => normalized(value).split(" ").filter(Boolean).sort().join("|");
  return tokens(left) === tokens(right);
}

function safeId(value: string) {
  return normalized(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function camaraPeriod(label: string | null | undefined) {
  const match = normalized(label ?? "").toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  const month = match ? MONTHS[match[1]] : null;
  return match && month ? `${match[2]}-${month}-01` : null;
}

function evidenceRecord(input: {
  id: string;
  entityId: string;
  title: string;
  description: string;
  occurredAt: string | null;
  amount: number;
  sourceUrl: string;
  retrievedAt: string;
  data: Record<string, unknown>;
}): EvidenceRecord {
  return {
    id: input.id,
    kind: "contract",
    sourceId: "personal-apoyo",
    title: input.title,
    description: input.description,
    occurredAt: input.occurredAt,
    period: { from: input.occurredAt, to: input.occurredAt, label: input.occurredAt },
    subjectEntityIds: [input.entityId],
    objectEntityIds: [],
    amount: {
      amountClp: input.amount,
      currency: "CLP",
      originalAmount: String(input.amount),
      originalUnit: "pesos chilenos",
    },
    evidence: {
      sourceUrl: input.sourceUrl,
      checksumSha256: null,
      retrievedAt: input.retrievedAt,
      documentPage: null,
    },
    data: input.data,
  };
}

/** Proyecta el personal oficial en evidencia de la ficha sin inferir identidades. */
export function personalApoyoEvidenceRecords(
  entity: CanonicalEntity,
  dataset: PersonalApoyoDataset | null,
): EvidenceRecord[] {
  if (!dataset || entity.kind !== "person") return [];
  const camaraId = entity.identifiers.find((identifier) => identifier.scheme === "camara-dipid")?.value;
  if (camaraId) {
    const diputado = dataset.diputados[String(camaraId)];
    if (!diputado) return [];
    const occurredAt = camaraPeriod(diputado.mes_personal);
    const sourceUrl = (dataset.fuentes.camara?.url ?? "https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId={id}")
      .replace("{id}", encodeURIComponent(camaraId));
    return diputado.personal_apoyo.map((row, index) => evidenceRecord({
      id: `personal-apoyo-camara-${camaraId}-${occurredAt ?? "sin-periodo"}-${index}-${safeId(row.nombre)}`,
      entityId: entity.id,
      title: row.nombre,
      description: [row.tipo, row.cargo, row.cargo_servel ? `Cargo SERVEL: ${row.cargo_servel}` : null, row.cese ? `Cese: ${row.cese}` : null].filter(Boolean).join(" · "),
      occurredAt,
      amount: Number(row.sueldo) || 0,
      sourceUrl,
      retrievedAt: dataset.generado_en,
      data: { tipo: row.tipo, cargo: row.cargo, cargo_servel: row.cargo_servel ?? "", cese: row.cese ?? "", periodo_publicado: diputado.mes_personal },
    }));
  }

  if (!entity.identifiers.some((identifier) => identifier.scheme === "senado-id")) return [];
  const offices = Object.entries(dataset.senadores).filter(([office]) => sameNameTokens(office, entity.name));
  if (offices.length !== 1) return [];
  const latest = [...offices[0][1]].sort((a, b) => b.periodo.localeCompare(a.periodo))[0]?.periodo;
  if (!latest) return [];
  const sourceUrl = dataset.fuentes.senado?.url ?? "https://www.senado.cl/transparencia";
  return offices[0][1].filter((row) => row.periodo === latest).map((row, index) => {
    const title = [row.nombre, row.apellido_paterno, row.apellido_materno].filter(Boolean).join(" ");
    return evidenceRecord({
      id: `personal-apoyo-senado-${safeId(entity.id)}-${latest}-${index}-${safeId(title)}`,
      entityId: entity.id,
      title,
      description: [row.calidad_juridica, row.cargo].filter(Boolean).join(" · "),
      occurredAt: `${latest}-01`,
      amount: Number(row.monto) || 0,
      sourceUrl,
      retrievedAt: dataset.generado_en,
      data: { cargo: row.cargo, calidad_juridica: row.calidad_juridica, periodo_publicado: latest },
    });
  });
}

import { getKvCache } from "@/lib/db";

let cached: PersonalApoyoDataset | null = null;
let cachedPromise: Promise<PersonalApoyoDataset | null> | null = null;

/** Carga el dataset de personal de apoyo desde el caché KV en D1. */
export async function leerPersonalApoyo(): Promise<PersonalApoyoDataset | null> {
  if (!cached) {
    cachedPromise ??= (async () => {
      const fromD1 = await getKvCache<PersonalApoyoDataset>("personal-apoyo.json");
      if (fromD1) return fromD1;
      try {
        return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "personal-apoyo.json"), "utf8")) as PersonalApoyoDataset;
      } catch {
        return null;
      }
    })();
    cached = await cachedPromise;
  }
  return cached;
}

export async function personalApoyoEvidenceParaEntidad(entity: CanonicalEntity) {
  return personalApoyoEvidenceRecords(entity, await leerPersonalApoyo());
}

export interface PersonalApoyoDiputado {
  diputado: DiputadoPersonalApoyo | null;
  total_mensual: number;
  n_personas: number;
  n_contratos: number;
  n_honorarios: number;
}

/** Datos de personal de apoyo de un diputado por su id de nómina (prmId). */
export async function personalApoyoParaDiputado(
  diputadoCamaraId: string | null | undefined
): Promise<PersonalApoyoDiputado> {
  if (!diputadoCamaraId) {
    return { diputado: null, total_mensual: 0, n_personas: 0, n_contratos: 0, n_honorarios: 0 };
  }
  const dataset = await leerPersonalApoyo();
  const diputado = dataset?.diputados[String(diputadoCamaraId)] ?? null;
  if (!diputado) {
    return { diputado: null, total_mensual: 0, n_personas: 0, n_contratos: 0, n_honorarios: 0 };
  }
  const filas = diputado.personal_apoyo;
  return {
    diputado,
    total_mensual: filas.reduce((total, fila) => total + (fila.sueldo ?? 0), 0),
    n_personas: filas.length,
    n_contratos: filas.filter((f) => /contrato/i.test(f.tipo ?? "")).length,
    n_honorarios: filas.filter((f) => /honorario/i.test(f.tipo ?? "")).length,
  };
}

export interface PersonalApoyoSenador {
  registros: RegistroSenadorPersonalApoyo[];
  total_2026: number;
  ultimo_mes: string;
}

/** Registros de personal de apoyo de un senador (match por nombre de oficina oficial). */
export async function personalApoyoParaSenador(nombreCompleto: string): Promise<PersonalApoyoSenador> {
  const dataset = await leerPersonalApoyo();
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim();

  const targetName = normalize(nombreCompleto);
  const targetTokens = targetName.split(/\s+/).filter((t) => t.length >= 3);

  // Intentar primero inclusión directa, luego matching por tokens (mínimo 2 tokens coincidentes)
  let matched = Object.entries(dataset?.senadores ?? {}).find(([oficina]) =>
    normalize(oficina).includes(targetName)
  );

  if (!matched) {
    matched = Object.entries(dataset?.senadores ?? {}).find(([oficina]) => {
      const normOfi = normalize(oficina);
      const matches = targetTokens.filter((t) => normOfi.includes(t)).length;
      return matches >= Math.min(2, targetTokens.length);
    });
  }

  if (!matched) {
    return { registros: [], total_2026: 0, ultimo_mes: "" };
  }

  const filas = matched[1];
  const registros = filas.sort((a, b) => (b.periodo ?? "").localeCompare(a.periodo ?? ""));
  const total_2026 = registros.reduce((total, r) => total + (r.monto ?? 0), 0);
  const ultimo_mes = registros[0]?.periodo ?? "";
  return { registros, total_2026, ultimo_mes };
}

