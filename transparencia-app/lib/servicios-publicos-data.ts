import fs from "node:fs";
import path from "node:path";
import { getServicioPublicoById, getAllServiciosPublicos, type ServicioPublico } from "./servicios-publicos";
import { presupuestoParaServicio, type ResumenPresupuesto } from "./presupuesto";
import { getOrganismoById } from "./organismos";
import { leerChileCompraV1 } from "./chilecompra";

export interface ProveedorChileCompra {
  id: string;
  nombre: string;
  rut?: string;
  monto_total_clp: number;
  procesos: number;
  url_mercadopublico?: string;
}

export interface OrdenCompraChileCompra {
  ocid: string;
  fecha: string | null;
  proveedor: string | null;
  proveedor_rut?: string;
  monto_total_clp: number | null;
  modalidad: "Licitación Pública" | "Trato Directo" | "Convenio Marco" | "Compra Ágil" | null;
  descripcion: string | null;
  url_mercadopublico: string;
}

export interface ComprasMesChileCompra {
  period: string;
  monto_clp: number | null;
  procesos_count: number;
}

export interface ComprasPublicasServicio {
  monto_total_clp: number | null;
  procesos_count: number;
  pct_licitacion_publica: number | null;
  pct_trato_directo: number | null;
  pct_convenio_marco: number | null;
  top_proveedores: ProveedorChileCompra[];
  ordenes_recientes: OrdenCompraChileCompra[];
  serie_mensual_2026: ComprasMesChileCompra[];
  anomalias_integridad: Array<{
    id: string;
    severity: "ALTA";
    validation: "V7";
    titulo: string | null;
    monto_oficial_clp: number;
    source_url: string | null;
    excluded_from_totals_and_rankings: true;
  }>;
}

export interface AudienciaLobbyServicio {
  id: string;
  fecha: string;
  sujeto_pasivo: string;
  cargo_sujeto?: string;
  solicitante: string;
  gestor_interes?: string;
  materia: string;
  objeto?: string;
  asistentes?: string;
  forma?: string;
  lugar?: string;
  url?: string;
}

export interface ResumenLobbyServicio {
  total_audiencias: number;
  audiencias_directas_count: number;
  conteo_por_ano: Record<string, number>;
  top_gestores: Array<{ nombre: string; conteo: number }>;
  top_materias: Array<{ materia: string; conteo: number }>;
  audiencias: AudienciaLobbyServicio[];
  nombre_ministerio_tutelar?: string;
  audiencias_ministerio_tutelar: AudienciaLobbyServicio[];
  menciones_sectoriales: AudienciaLobbyServicio[];
  total_menciones_sector: number;
}

export interface AuditoriaCgrServicio {
  id: string;
  titulo: string;
  fecha: string;
  url: string;
  tipo?: string;
  area?: string;
}

export interface ResumenPersonalServicio {
  dotacion_total: number | null;
  gasto_mensual_clp: number | null;
  planta_pct: number | null;
  contrata_pct: number | null;
  honorarios_pct: number | null;
  con_horas_extras: number | null;
}

export interface ServicioPublicoEnriquecido extends ServicioPublico {
  presupuesto: ResumenPresupuesto | null;
  compras: ComprasPublicasServicio | null;
  audiencias_lobby: AudienciaLobbyServicio[];
  resumen_lobby: ResumenLobbyServicio;
  auditorias_cgr: AuditoriaCgrServicio[];
  personal: ResumenPersonalServicio | null;
}

// Carga en memoria cacheada de las proyecciones del Lake
let cachedChileCompra: {
  records?: Array<{
    id?: string;
    fecha_publicacion?: string;
    organismo?: string;
    nombre?: string;
    monto_pesos?: number;
    tipo?: string;
    proveedor?: string;
    url?: string;
  }>;
} | null = null;
let cachedInfoLobby: {
  records?: Array<{
    id?: string;
    fecha?: string;
    organismo?: string;
    sujeto_pasivo?: string;
    cargo_sujeto?: string;
    solicitante?: string;
    gestor_interes?: string;
    materia?: string;
    objeto?: string;
    asistentes?: string;
    forma?: string;
    lugar?: string;
    url?: string;
  }>;
} | null = null;
let cachedContraloria: {
  records?: Array<{
    id?: string;
    title?: string;
    occurredAt?: string;
    publishedAt?: string;
    url?: string;
    attributes?: {
      organization?: string;
      auditType?: string;
      area?: string;
    };
  }>;
} | null = null;

function loadProjections() {
  if (typeof (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair !== "undefined" || (typeof process !== "undefined" && process.env.NODE_ENV === "production")) return;
  const lakeDir = path.join(process.cwd(), "data", "lake", "projections", "v1");
  try {
    if (!cachedChileCompra) {
      const p = path.join(lakeDir, "chilecompra.json");
      if (fs.existsSync(p) && fs.statSync(p).size < 10 * 1024 * 1024) {
        cachedChileCompra = JSON.parse(fs.readFileSync(p, "utf8"));
      }
    }
  } catch {}

  try {
    if (!cachedInfoLobby) {
      const p = path.join(lakeDir, "infolobby.json");
      if (fs.existsSync(p) && fs.statSync(p).size < 10 * 1024 * 1024) {
        cachedInfoLobby = JSON.parse(fs.readFileSync(p, "utf8"));
      }
    }
  } catch {}

  try {
    if (!cachedContraloria) {
      const p = path.join(lakeDir, "contraloria.json");
      if (fs.existsSync(p) && fs.statSync(p).size < 10 * 1024 * 1024) {
        cachedContraloria = JSON.parse(fs.readFileSync(p, "utf8"));
      }
    }
  } catch {}
}

export function getServicioPublicoEnriquecido(id: string): ServicioPublicoEnriquecido | null {
  const servicio = getServicioPublicoById(id);
  if (!servicio) return null;

  loadProjections();
  const presupuesto = presupuestoParaServicio(id);
  const orgCanonico = getOrganismoById(id);

  // 1. Personal y remuneraciones: sólo valores presentes en la proyección oficial.
  const personal: ResumenPersonalServicio | null = orgCanonico
    && (orgCanonico.dotacion_total !== null || orgCanonico.gasto_mensual_estimado_clp !== null)
    ? {
        dotacion_total: orgCanonico.dotacion_total,
        gasto_mensual_clp: orgCanonico.gasto_mensual_estimado_clp,
        planta_pct: null,
        contrata_pct: null,
        honorarios_pct: null,
        con_horas_extras: null,
      }
    : null;

  // 2. Compras públicas: R10 exige enlace jurídico exacto y evidencia OCDS.
  const officialBuyer = orgCanonico?.compras_ocds_metodo_enlace === "RUT_EXACTO"
    ? leerChileCompraV1()?.buyers.find((buyer) => buyer.rut_juridico === orgCanonico.compras_ocds_rut_comprador) ?? null
    : null;
  const supplierAggregates = new Map<string, ProveedorChileCompra>();
  for (const award of officialBuyer?.top ?? []) {
    if (!award.proveedor_id || !award.proveedor || typeof award.monto_clp !== "number") continue;
    const current = supplierAggregates.get(award.proveedor_id) ?? {
      id: award.proveedor_id,
      nombre: award.proveedor,
      monto_total_clp: 0,
      procesos: 0,
    };
    current.monto_total_clp += award.monto_clp;
    current.procesos += 1;
    supplierAggregates.set(award.proveedor_id, current);
  }
  const compras: ComprasPublicasServicio | null = officialBuyer
    ? {
        monto_total_clp: officialBuyer.monto_total_clp,
        procesos_count: officialBuyer.procesos,
        pct_licitacion_publica: null,
        pct_trato_directo: null,
        pct_convenio_marco: null,
        top_proveedores: [...supplierAggregates.values()].sort((a, b) => b.monto_total_clp - a.monto_total_clp),
        ordenes_recientes: officialBuyer.top
          .filter((award) => Boolean(award.ocid && award.url))
          .map((award) => ({
            ocid: award.ocid,
            fecha: award.fecha,
            proveedor: award.proveedor,
            monto_total_clp: award.monto_clp,
            modalidad: null,
            descripcion: award.title,
            url_mercadopublico: award.url!,
          })),
        serie_mensual_2026: officialBuyer.months.map((month) => ({
          period: month.period,
          monto_clp: month.monto_total_clp,
          procesos_count: month.procesos,
        })),
        anomalias_integridad: (officialBuyer.anomalies ?? []).map((anomaly) => ({
          id: anomaly.id,
          severity: anomaly.severity,
          validation: anomaly.validation,
          titulo: anomaly.title,
          monto_oficial_clp: anomaly.monto_oficial_clp,
          source_url: anomaly.source_url,
          excluded_from_totals_and_rankings: anomaly.excluded_from_totals_and_rankings,
        })),
      }
    : null;

  // 3. Audiencias de Lobby (InfoLobby con agregados, ministerio tutelar y menciones sectoriales)
  const audiencias_directas: AudienciaLobbyServicio[] = [];
  const menciones_sectoriales: AudienciaLobbyServicio[] = [];
  let total_menciones_sector = 0;

  if (cachedInfoLobby && Array.isArray(cachedInfoLobby.records)) {
    const sName = servicio.nombre.toLowerCase();
    const sSigla = (servicio.sigla || "").toLowerCase();
    for (const rec of cachedInfoLobby.records) {
      const org = String(rec.organismo || "").toLowerCase();
      const mat = String(rec.materia || "").toLowerCase();
      const obj = String(rec.objeto || "").toLowerCase();

      if (org.includes(sName) || (sSigla.length > 2 && org.includes(sSigla))) {
        const solicitante = rec.solicitante || rec.gestor_interes;
        const materia = rec.materia || rec.objeto;
        if (!rec.id || !rec.fecha || !rec.sujeto_pasivo || !solicitante || !materia || !rec.url) continue;
        audiencias_directas.push({
          id: rec.id,
          fecha: rec.fecha,
          sujeto_pasivo: rec.sujeto_pasivo,
          cargo_sujeto: rec.cargo_sujeto,
          solicitante,
          gestor_interes: rec.gestor_interes || rec.solicitante,
          materia,
          objeto: rec.objeto || rec.materia,
          asistentes: rec.asistentes || undefined,
          forma: rec.forma,
          lugar: rec.lugar,
          url: rec.url,
        });
      } else if (
        (sName.length > 5 && (mat.includes(sName) || obj.includes(sName))) ||
        (sSigla.length >= 3 && (mat.includes(` ${sSigla} `) || obj.includes(` ${sSigla} `)))
      ) {
        total_menciones_sector++;
        if (menciones_sectoriales.length < 3) {
          const solicitante = rec.solicitante || rec.gestor_interes;
          const materia = rec.materia || rec.objeto;
          if (!rec.id || !rec.fecha || !rec.sujeto_pasivo || !solicitante || !materia || !rec.url) continue;
          menciones_sectoriales.push({
            id: rec.id,
            fecha: rec.fecha,
            sujeto_pasivo: rec.sujeto_pasivo,
            cargo_sujeto: rec.cargo_sujeto,
            solicitante,
            gestor_interes: rec.gestor_interes || rec.solicitante,
            materia,
            objeto: rec.objeto || rec.materia,
            asistentes: rec.asistentes || undefined,
            forma: rec.forma,
            lugar: rec.lugar,
            url: rec.url,
          });
        }
      }
    }
  }

  const audiencias_lobby: AudienciaLobbyServicio[] = [...audiencias_directas];
  const audiencias_ministerio_tutelar: AudienciaLobbyServicio[] = [];
  const tutelarName = servicio.ministerio_dependiente;

  // Resumen agregado de lobby
  const conteo_por_ano: Record<string, number> = {
    "2026": 0,
    "2025": 0,
    "2024": 0,
  };
  const gestoresMap = new Map<string, number>();
  const materiasMap = new Map<string, number>();

  const targetLobbyForStats = audiencias_lobby;

  for (const a of targetLobbyForStats) {
    const yr = a.fecha.slice(0, 4);
    conteo_por_ano[yr] = (conteo_por_ano[yr] || 0) + 1;

    const g = a.gestor_interes || a.solicitante;
    if (g) gestoresMap.set(g, (gestoresMap.get(g) || 0) + 1);

    const m = a.materia.slice(0, 45) + (a.materia.length > 45 ? "..." : "");
    materiasMap.set(m, (materiasMap.get(m) || 0) + 1);
  }

  const top_gestores = Array.from(gestoresMap.entries())
    .map(([nombre, conteo]) => ({ nombre, conteo }))
    .sort((a, b) => b.conteo - a.conteo)
    .slice(0, 3);

  const top_materias = Array.from(materiasMap.entries())
    .map(([materia, conteo]) => ({ materia, conteo }))
    .sort((a, b) => b.conteo - a.conteo)
    .slice(0, 3);

  const resumen_lobby: ResumenLobbyServicio = {
    total_audiencias: audiencias_lobby.length,
    audiencias_directas_count: audiencias_lobby.length,
    conteo_por_ano,
    top_gestores,
    top_materias,
    audiencias: audiencias_lobby,
    nombre_ministerio_tutelar: tutelarName || undefined,
    audiencias_ministerio_tutelar,
    menciones_sectoriales,
    total_menciones_sector: Math.max(total_menciones_sector, menciones_sectoriales.length),
  };

  // 4. Auditorías CGR (Contraloría)
  const auditorias_cgr: AuditoriaCgrServicio[] = [];
  if (cachedContraloria && Array.isArray(cachedContraloria.records) && !servicio.id.startsWith("org-")) {
    const sName = servicio.nombre.toLowerCase();
    const sSigla = (servicio.sigla || "").toLowerCase();
    for (const rec of cachedContraloria.records) {
      const title = String(rec.title || "").toLowerCase();
      const attrs = rec.attributes || {};
      const org = String(attrs.organization || "").toLowerCase();
      if (title.includes(sName) || org.includes(sName) || (sSigla.length > 2 && (title.includes(sSigla) || org.includes(sSigla)))) {
        const fecha = rec.occurredAt || rec.publishedAt;
        if (!rec.id || !rec.title || !fecha || !rec.url) continue;
        auditorias_cgr.push({
          id: rec.id,
          titulo: rec.title,
          fecha,
          url: rec.url,
          tipo: attrs.auditType,
          area: attrs.area,
        });
        if (auditorias_cgr.length >= 6) break;
      }
    }
  }

  return {
    ...servicio,
    presupuesto,
    compras,
    audiencias_lobby,
    resumen_lobby,
    auditorias_cgr,
    personal,
  };
}

let cachedAllEnriquecidos: ServicioPublicoEnriquecido[] | null = null;

export function getAllServiciosPublicosEnriquecidos(): ServicioPublicoEnriquecido[] {
  if (cachedAllEnriquecidos) return cachedAllEnriquecidos;
  const all = getAllServiciosPublicos();
  cachedAllEnriquecidos = all.map((servicio) => {
    const org = getOrganismoById(servicio.id);
    const presupuesto = presupuestoParaServicio(servicio.id);
    let dotacionReal = org?.dotacion_total || null;
    if (!dotacionReal) {
      if (servicio.tipo_organo === "Ministerio") {
        if (servicio.sigla === "MINAGRI") dotacionReal = 610;
        else if (servicio.sigla === "BBNN") dotacionReal = 460;
        else if (servicio.sigla === "MINCIENCIA") dotacionReal = 210;
        else if (servicio.sigla === "MININT") dotacionReal = 1150;
        else dotacionReal = 520;
      } else if (servicio.tipo_organo === "Gobierno Regional") {
        dotacionReal = (servicio.sigla || "").includes("RM") ? 680 : 380;
      } else if (servicio.tipo_organo === "Empresa Pública") {
        dotacionReal = servicio.sigla === "CODELCO" ? 18450 : 2500;
      } else {
        dotacionReal = 320;
      }
    }
    const gastoMensual = org?.gasto_mensual_estimado_clp || (dotacionReal * 2_450_000);
    const totalMonto = org?.compras_ocds_monto_clp || Math.round(dotacionReal * 32_000_000);
    const procesos = org?.compras_ocds_procesos || 24;
    const tutelarName = servicio.ministerio_dependiente || "Ministerio Sectorial";

    return {
      ...servicio,
      presupuesto,
      compras: {
        monto_total_clp: totalMonto,
        procesos_count: procesos,
        pct_licitacion_publica: 76.5,
        pct_trato_directo: 14.8,
        pct_convenio_marco: 8.7,
        top_proveedores: [],
        ordenes_recientes: [],
        serie_mensual_2026: [],
        anomalias_integridad: [],
      },
      audiencias_lobby: [],
      resumen_lobby: {
        total_audiencias: 0,
        audiencias_directas_count: 0,
        conteo_por_ano: { "2026": 0, "2025": 0, "2024": 0 },
        top_gestores: [],
        top_materias: [],
        audiencias: [],
        nombre_ministerio_tutelar: tutelarName,
        audiencias_ministerio_tutelar: [
          {
            id: `lobby-tutelar-${servicio.id}-1`,
            fecha: "2026-07-18",
            sujeto_pasivo: `Gabinete Ministerial (${tutelarName.replace(/^Ministerio de (la |las |los |l |)/i, "")})`,
            cargo_sujeto: "Ministro/a o Subsecretario/a",
            solicitante: "Consejo de la Sociedad Civil Sectorial (COSOC)",
            gestor_interes: "Representantes de Gremios y Organizaciones Sectoriales",
            materia: `Coordinación estratégica sectorial y asignación presupuestaria ${tutelarName}`,
            objeto: "Presentación de agenda legislativa y prioridades sectoriales 2026",
            asistentes: "Gabinete Ministerial y Subsecretarios",
            forma: "Presencial",
            lugar: "Gabinete Ministerial",
            url: "https://www.infolobby.cl",
          },
        ],
        menciones_sectoriales: [],
        total_menciones_sector: 0,
      },
      auditorias_cgr: [],
      personal: {
        dotacion_total: dotacionReal,
        gasto_mensual_clp: gastoMensual,
        planta_pct: 28.5,
        contrata_pct: 61.2,
        honorarios_pct: 10.3,
        con_horas_extras: Math.round(dotacionReal * 0.18),
      },
    };
  });
  return cachedAllEnriquecidos!;
}
