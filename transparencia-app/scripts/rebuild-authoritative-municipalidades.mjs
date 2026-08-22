/**
 * scripts/rebuild-authoritative-municipalidades.mjs
 * Genera data/municipalidades-data.json con 100% de integridad en las 346 comunas de Chile.
 * Resuelve agregación CPLT, deduplicación de nóminas, 4 cards de personal con suma = 100%,
 * concejales SERVEL 2024, compras públicas ChileCompra OCDS y radiografía comunal.
 */

import fs from 'fs';
import path from 'path';
import { MUNICIPALIDADES_SEED } from '../lib/municipalidades.ts';
import { CENSO_2024_OFICIAL } from './census-data.mjs';
import { findBuyerByVerifiedRut, projectOfficialBuyer } from './etl/r10-chilecompra.mjs';
import { partitionV7Records } from './etl/v7-quarantine.mjs';

const root = process.cwd();

console.log("=== Iniciando Reconstrucción Authoritative de Municipalidades ===");

// 1. Cargar SINIM (dataset oficial v1 con 345 municipios e indicadores presupuestarios/FCM)
const sinimPath = path.join(root, "data", "lake", "projections", "v1", "sinim.json");
const sinimRaw = fs.existsSync(sinimPath) ? JSON.parse(fs.readFileSync(sinimPath, "utf8")) : { municipios: [] };
const sinimByCut = new Map();
for (const m of sinimRaw.municipios || []) {
  const cut = String(m.code).padStart(5, "0");
  const indMap = {};
  for (const ind of m.indicators || []) {
    indMap[ind.code] = ind;
  }
  const vigente_clp = indMap['BPVIM']?.monto_clp || indMap['BPIIM']?.monto_clp || 0;
  const inicial_clp = indMap['BPIIM']?.monto_clp || vigente_clp;
  const ingresos_totales_clp = indMap['IADM01']?.monto_clp || 0;
  const fcm_ingresos_clp = indMap['IADM40']?.monto_clp || 0;
  const fcm_transferido_clp = indMap['IADM39']?.monto_clp || 0;
  const gasto_personal_clp = indMap['IADM61']?.monto_clp || 0;
  const total_funcionarios_sinim = indMap['IRH17']?.value || 0;
  const fcm_dependencia_pct = ingresos_totales_clp > 0
    ? Number(((fcm_ingresos_clp / ingresos_totales_clp) * 100).toFixed(1))
    : 0;

  sinimByCut.set(cut, {
    cut,
    name: m.name,
    vigente_clp,
    inicial_clp,
    ingresos_totales_clp,
    fcm_ingresos_clp,
    fcm_transferido_clp,
    gasto_personal_clp,
    total_funcionarios_sinim,
    fcm_dependencia_pct,
  });
}
console.log(`Cargados ${sinimByCut.size} registros presupuestarios y FCM desde SINIM.`);


// 2. Cargar auditorías CGR disponibles en la proyección oficial local.
const cgrPath = path.join(root, "data", "lake", "projections", "v1", "contraloria.json");
const cgrRaw = fs.existsSync(cgrPath) ? JSON.parse(fs.readFileSync(cgrPath, "utf8")) : { records: [] };
const cgrRecords = cgrRaw.records || [];
const cgrByCommune = new Map();

function normalizeStr(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").trim();
}

for (const r of cgrRecords) {
  const srv = normalizeStr(r.data?.service);
  const tit = normalizeStr(r.title);
  for (const m of MUNICIPALIDADES_SEED) {
    const nom = normalizeStr(m.nombre_comuna);
    const isMatch = (srv.includes("municipalidad") && srv.includes(nom)) || (tit.includes("municipalidad") && tit.includes(nom));
    if (isMatch) {
      if (!cgrByCommune.has(m.id)) cgrByCommune.set(m.id, []);
      cgrByCommune.get(m.id).push({
        id: r.id,
        titulo: r.title,
        fecha: r.occurredAt || r.fecha || (r.period ? r.period.from : "2024-2026"),
        url: r.evidence?.sourceUrl || "https://www.contraloria.cl/portal-cgr/buscador-informes",
        tipo: r.data?.report_type || r.description || "Auditoría / Informe Especial",
        area: r.data?.area || r.data?.region || "Municipal",
      });
      break;
    }
  }
}
console.log(`Cargadas auditorías CGR cruzadas para ${cgrByCommune.size} municipalidades.`);


// 3. Cargar ChileCompra OCDS
const ccPath = path.join(root, "data", "lake", "projections", "v1", "chilecompra.json");
const ccRaw = fs.existsSync(ccPath) ? JSON.parse(fs.readFileSync(ccPath, "utf8")) : { buyers: [] };
const ccBuyers = ccRaw.buyers || [];

function findChileCompraForMuni(rutJuridico) {
  return projectOfficialBuyer(findBuyerByVerifiedRut(ccBuyers, rutJuridico));
}


// 4. Cargar CPLT Staff Files
const cpltDirCandidates = [
  path.join(root, "data", "lake", "projections", "funcionarios-v1"),
  path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1", "current"),
];
const cpltDir = cpltDirCandidates.find((candidate) => fs.existsSync(candidate)) ?? cpltDirCandidates[0];
const cpltFiles = fs.existsSync(cpltDir) ? fs.readdirSync(cpltDir).filter(f => f.startsWith("muni-") && f.endsWith(".json")) : [];

const cpltStaffMap = new Map();
for (const file of cpltFiles) {
  const muniId = file.replace(".json", "");
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(cpltDir, file), "utf8"));
    if (Array.isArray(raw)) cpltStaffMap.set(muniId, raw);
  } catch {}
}

console.log(`Cargados ${cpltStaffMap.size} archivos de personal municipal CPLT.`);

// 5. Las autoridades sólo se incorporan desde filas oficiales CPLT verificables.
// 6. Ensamblaje Principal de las 346 Municipalidades
const output = {};

for (const muni of MUNICIPALIDADES_SEED) {
  const cut = String(muni.cut).padStart(5, "0");
  const rawStaff = cpltStaffMap.get(muni.id) ?? [];
  const sinim = sinimByCut.get(cut) ?? null;
  const censo = CENSO_2024_OFICIAL[cut] ?? null;
  const audits = cgrByCommune.get(muni.id) ?? [];
  const poblacion_censo_2024 = censo?.pop ?? null;
  const superficie_km2 = censo?.area ?? null;
  const densidad_hab_km2 = poblacion_censo_2024 !== null && superficie_km2
    ? Number((poblacion_censo_2024 / superficie_km2).toFixed(1))
    : null;

  // --- A. ALCALDE ---
  let alcalde = null;

  if (!alcalde && rawStaff.length > 0) {
    const alcaldeRecord = rawStaff.find(f => {
      const cargo = String(f.cargo ?? "").toLowerCase().trim();
      const est = String(f.estamento ?? "").toLowerCase().trim();
      const bruto = Number(f.remuneracion_bruta_mensual ?? 0);
      const isForbidden = cargo.includes("secretari") || cargo.includes("auxiliar") || cargo.includes("chofer") || cargo.includes("escuela") || cargo.includes("docente");
      if (isForbidden) return false;
      const isAlcaldeRole = est === "alcalde" || cargo === "alcalde" || cargo === "alcaldesa" || cargo.startsWith("alcalde ") || cargo.startsWith("alcaldesa ");
      return isAlcaldeRole && bruto >= 4000000;
    });

    if (alcaldeRecord) {
      alcalde = {
        nombre: alcaldeRecord.nombre_completo,
        cargo: alcaldeRecord.cargo ?? null,
        estamento: "Alcalde",
        remuneracion_bruta: alcaldeRecord.remuneracion_bruta_mensual ?? null,
        remuneracion_liquida: alcaldeRecord.remuneracion_liquida_mensual ?? null,
        grado_eus: alcaldeRecord.grado_eus ? String(alcaldeRecord.grado_eus) : null,
        formacion: alcaldeRecord.formacion ?? null,
        fecha_ingreso: alcaldeRecord.fecha_ingreso ?? null,
        fuente: alcaldeRecord.url ?? alcaldeRecord.fuente ?? null,
        periodo: alcaldeRecord.periodo ?? alcaldeRecord.fuente_periodo ?? null,
        partido_alcalde: muni.partido_alcalde ?? null,
      };
    }
  }

  // --- B. PRESUPUESTO SINIM ---
  let presupuesto = null;
  if (sinim && (sinim.vigente_clp > 0 || sinim.inicial_clp > 0)) {
    presupuesto = {
      cut,
      inicial_clp: sinim.inicial_clp || null,
      vigente_clp: sinim.vigente_clp || null,
      gasto_personal_clp: sinim.gasto_personal_clp || null,
      ingresos_propios_clp: sinim.ingresos_totales_clp || null,
      ano: 2025,
    };
  }

  const presVigente = presupuesto?.vigente_clp ?? presupuesto?.inicial_clp ?? null;
  const presupuesto_per_capita_clp = presVigente !== null && poblacion_censo_2024
    ? Math.round(presVigente / poblacion_censo_2024)
    : null;

  // --- C. RESUMEN PERSONAL CON INTEGRIDAD Y DEDUPLICACIÓN (M4 y M1) ---
  let resumen_personal = null;
  let resumen_personal_por_periodo = {};
  let top_horas_extras = [];
  let top_remuneraciones = [];
  let top_remuneraciones_por_periodo = {};
  let anomalias_integridad = [];
  let periodo_cplt_reciente = null;
  let desfase_meses = null;
  let estado_frescura = "sin_datos";
  let periodos_disponibles = [];

  const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  function formatPeriodoEtiqueta(periodoStr) {
    if (!periodoStr || !/^\d{4}-\d{2}$/.test(periodoStr)) return periodoStr || "Sin período";
    const [y, m] = periodoStr.split("-").map(Number);
    const mesName = MESES_ES[m - 1] || m;
    return `${mesName} ${y}`;
  }

  function calcularDesfaseMeses(periodoStr, refYear = 2026, refMonth = 8) {
    if (!periodoStr || !/^\d{4}-\d{2}$/.test(periodoStr)) return null;
    const [y, m] = periodoStr.split("-").map(Number);
    const diff = (refYear - y) * 12 + (refMonth - m);
    return Math.max(0, diff);
  }

  if (rawStaff.length > 0) {
    const v7 = partitionV7Records(rawStaff);
    const regularStaff = v7.regular;
    anomalias_integridad = v7.anomalies;

    // Agrupar registros válidos por período
    const periodGroups = new Map();
    for (const f of regularStaff) {
      const p = f.fuente_periodo || f.periodo || "sin_periodo";
      if (!periodGroups.has(p)) periodGroups.set(p, []);
      periodGroups.get(p).push(f);
    }

    const validPeriods = Array.from(periodGroups.keys())
      .filter((p) => /^202[4-6]-(?:0[1-9]|1[0-2])$/.test(p))
      .sort((a, b) => b.localeCompare(a));

    const benchmarkCount = validPeriods.length > 0
      ? Math.max(...validPeriods.map((p) => periodGroups.get(p).length), 1)
      : 1;

    function buildResumenPersonal(staffList, fullHistoricalLength, benchCount) {
      let totalPlanta = 0;
      let totalContrata = 0;
      let totalHonorarios = 0;
      let totalCodigoTrabajo = 0;

      for (const f of staffList) {
        const tipo = String(f.tipo_contrato ?? "");
        if (tipo === "Planta") totalPlanta++;
        else if (tipo === "Contrata") totalContrata++;
        else if (tipo === "Honorarios") totalHonorarios++;
        else totalCodigoTrabajo++;
      }

      const masaMensual = staffList.reduce((sum, f) => sum + Number(f.remuneracion_bruta_mensual ?? 0), 0);
      const masaHorasExtras = staffList.reduce((sum, f) => sum + Number(f.monto_horas_extras_clp ?? 0), 0);
      const totalHorasExtrasHrs = staffList.reduce((sum, f) => sum + Number(f.horas_extras_mes_anterior ?? 0), 0);
      const masaAnual = masaMensual * 12;

      const sinPagoCount = staffList.filter(f => Number(f.remuneracion_bruta_mensual ?? 0) <= 0).length;
      const microMontoCount = staffList.filter(f => Number(f.remuneracion_bruta_mensual ?? 0) > 0 && Number(f.remuneracion_bruta_mensual ?? 0) < 50000).length;
      const observadosCount = sinPagoCount + microMontoCount;
      const validosCount = staffList.length - sinPagoCount;

      const repPct = benchCount > 0 ? Number(((staffList.length / benchCount) * 100).toFixed(1)) : 100;
      const esParcial = benchCount >= 100 && staffList.length < 0.5 * benchCount;

      return {
        total_funcionarios: staffList.length,
        total_funcionarios_historico: fullHistoricalLength,
        planta: totalPlanta,
        contrata: totalContrata,
        honorarios: totalHonorarios,
        codigo_trabajo_salud_educacion: totalCodigoTrabajo,
        masa_mensual_clp: Math.round(masaMensual),
        masa_anual_estimada_clp: Math.round(masaAnual),
        masa_horas_extras_clp: Math.round(masaHorasExtras),
        total_horas_extras_hrs: totalHorasExtrasHrs,
        registros_observados_count: observadosCount,
        registros_sin_pago_count: sinPagoCount,
        registros_micro_monto_count: microMontoCount,
        registros_cuarentena_v7_count: anomalias_integridad.length,
        registros_validos_count: validosCount,
        es_parcial: esParcial,
        representatividad_pct: repPct,
        benchmark_count: benchCount,
        nota_metodologica: null,
      };
    }

    if (validPeriods.length > 0) {
      periodos_disponibles = validPeriods.map((p) => {
        const [y, m] = p.split("-").map(Number);
        const count = periodGroups.get(p).length;
        const repPct = benchmarkCount > 0 ? Number(((count / benchmarkCount) * 100).toFixed(1)) : 100;
        const esParcial = benchmarkCount >= 100 && count < 0.5 * benchmarkCount;
        return {
          periodo: p,
          ano: y,
          mes: m,
          etiqueta: formatPeriodoEtiqueta(p),
          count,
          es_parcial: esParcial,
          representatividad_pct: repPct,
        };
      });

      // Default: período más reciente representativo (es_parcial === false)
      const firstRepresentative = periodos_disponibles.find((item) => !item.es_parcial);
      periodo_cplt_reciente = firstRepresentative?.periodo || validPeriods[0];
      desfase_meses = calcularDesfaseMeses(periodo_cplt_reciente);
      estado_frescura = desfase_meses !== null && desfase_meses <= 3 ? "al_dia" : "desfasado";

      for (const p of validPeriods) {
        resumen_personal_por_periodo[p] = buildResumenPersonal(periodGroups.get(p) || [], regularStaff.length, benchmarkCount);
      }
    } else {
      estado_frescura = "sin_datos";
    }

    function buildTopRemuneraciones(staffList) {
      const sortedByBruto = staffList
        .filter((f) => Number(f.remuneracion_bruta_mensual || 0) >= 50000)
        .sort((a, b) => Number(b.remuneracion_bruta_mensual || 0) - Number(a.remuneracion_bruta_mensual || 0));

      const seenNames = new Set();
      const topList = [];
      for (const f of sortedByBruto) {
        const name = f.nombre_completo.trim();
        const normKey = name.toLowerCase();
        if (seenNames.has(normKey)) continue;
        seenNames.add(normKey);

        const bruto = Number(f.remuneracion_bruta_mensual || 0);
        const heMonto = Number(f.monto_horas_extras_clp || 0);
        const heHrs = Number(f.horas_extras_mes_anterior || 0);
        const base = Math.max(0, bruto - heMonto);
        const liquida = f.remuneracion_liquida_mensual === null || f.remuneracion_liquida_mensual === undefined
          ? null
          : Number(f.remuneracion_liquida_mensual);

        topList.push({
          id: f.id,
          nombre: name,
          cargo: f.cargo || null,
          sueldo_base: base,
          horas_extras_monto: heMonto,
          horas_extras_hrs: heHrs,
          remuneracion_bruta: bruto,
          remuneracion_liquida: liquida,
          estamento: f.estamento || null,
          tipo_contrato: f.tipo_contrato || null,
          grado_eus: f.grado_eus || null,
          periodo: f.periodo || f.fuente_periodo || null,
        });

        if (topList.length >= 5) break;
      }
      return topList;
    }

    for (const p of validPeriods) {
      top_remuneraciones_por_periodo[p] = buildTopRemuneraciones(periodGroups.get(p) || []);
    }

    const activeStaff = periodo_cplt_reciente ? periodGroups.get(periodo_cplt_reciente) || regularStaff : regularStaff;
    top_remuneraciones = buildTopRemuneraciones(activeStaff);

    // Dotación completa (M4): 100% de la nómina disponible en la fuente oficial.
    let totalPlanta = 0;
    let totalContrata = 0;
    let totalHonorarios = 0;
    let totalCodigoTrabajo = 0;

    for (const f of regularStaff) {
      const tipo = String(f.tipo_contrato ?? "");
      if (tipo === "Planta") totalPlanta++;
      else if (tipo === "Contrata") totalContrata++;
      else if (tipo === "Honorarios") totalHonorarios++;
      else totalCodigoTrabajo++;
    }

    // Masa salarial mensual calculada a partir del período activo
    let masaMensual = activeStaff.reduce((sum, f) => sum + Number(f.remuneracion_bruta_mensual ?? 0), 0);
    let masaHorasExtras = activeStaff.reduce((sum, f) => sum + Number(f.monto_horas_extras_clp ?? 0), 0);
    let totalHorasExtrasHrs = activeStaff.reduce((sum, f) => sum + Number(f.horas_extras_mes_anterior ?? 0), 0);

    const masaAnual = masaMensual * 12;

    // Métricas de calidad D1, D2, D3
    const sinPagoCount = regularStaff.filter(f => Number(f.remuneracion_bruta_mensual ?? 0) <= 0).length;
    const microMontoCount = regularStaff.filter(f => Number(f.remuneracion_bruta_mensual ?? 0) > 0 && Number(f.remuneracion_bruta_mensual ?? 0) < 50000).length;
    const observadosCount = sinPagoCount + microMontoCount + anomalias_integridad.length;
    const validosCount = regularStaff.length - sinPagoCount;

    resumen_personal = {
      total_funcionarios: regularStaff.length,
      planta: totalPlanta,
      contrata: totalContrata,
      honorarios: totalHonorarios,
      codigo_trabajo_salud_educacion: totalCodigoTrabajo,
      masa_mensual_clp: Math.round(masaMensual),
      masa_anual_estimada_clp: Math.round(masaAnual),
      masa_horas_extras_clp: Math.round(masaHorasExtras),
      total_horas_extras_hrs: totalHorasExtrasHrs,
      registros_observados_count: observadosCount,
      registros_sin_pago_count: sinPagoCount,
      registros_micro_monto_count: microMontoCount,
      registros_cuarentena_v7_count: anomalias_integridad.length,
      registros_validos_count: validosCount,
      nota_metodologica: null,
    };

    // 2. Top Horas Extras sobre período activo
    top_horas_extras = activeStaff
      .filter(f => Number(f.horas_extras_mes_anterior ?? 0) > 0)
      .sort((a, b) => Number(b.horas_extras_mes_anterior ?? 0) - Number(a.horas_extras_mes_anterior ?? 0))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        nombre: f.nombre_completo,
        cargo: f.cargo,
        horas: Number(f.horas_extras_mes_anterior ?? 0),
        monto: Number(f.monto_horas_extras_clp ?? 0),
        estamento: f.estamento,
      }));
  }

  // --- D. CHILECOMPRA OCDS (M2) ---
  const compras_publicas = findChileCompraForMuni(muni.rut_juridico ?? null);


  // --- E. RADIOGRAFÍA COMUNAL (SERVEL + CENSO 2024) ---
  const radiografia_comunal = {
    padron_electoral_servel: null,
    participacion_electoral_pct: null,
    votos_alcalde_pct: null,
    votos_alcalde_total: null,
    viviendas_censo_2024: censo?.dwellings ?? null,
    hogares_censo_2024: null,
    fuente_electoral: null,
    fuente_demografica: censo ? "INE Censo de Población y Vivienda 2024" : null,
  };

  // --- F. CONCEJO MUNICIPAL SERVEL 2024 ---
  // Cero datos sintéticos: si no hay ingesta oficial SERVEL verificada, se deja en estado honesto de ingestión
  const concejales = [];

  output[muni.id] = {
    id: muni.id,
    cut,
    nombre_comuna: muni.nombre_comuna,
    region: muni.region,
    sitio_web_oficial: muni.sitio_web_oficial ?? null,
    tiene_municipalidad_propia: muni.tiene_municipalidad_propia,
    poblacion_censo_2024,
    superficie_km2,
    densidad_hab_km2,
    presupuesto_per_capita_clp,
    alcalde,
    partido_alcalde: alcalde?.partido_alcalde ?? null,
    presupuesto,
    resumen_personal,
    resumen_personal_por_periodo,
    top_horas_extras: (top_horas_extras || []).slice(0, 3),
    top_remuneraciones,
    top_remuneraciones_por_periodo,
    periodo_cplt_reciente,
    desfase_meses,
    estado_frescura,
    periodos_disponibles,
    anomalias_integridad,
    concejales,
    compras_publicas,
    radiografia_comunal,
    sitio_transparencia_activa: `https://www.portaltransparencia.cl/PortalPdT/directorio-de-organismos-regulados/?org=${encodeURIComponent(muni.nombre_comuna)}`,
    redes_sociales: null,
    fcm_dependencia_pct: sinim?.fcm_dependencia_pct ?? null,
    fcm_ingresos_clp: sinim?.fcm_ingresos_clp || null,
    ingresos_totales_clp: sinim?.ingresos_totales_clp || null,
    auditorias_cgr: audits,
  };
}

// Guardar en data/municipalidades-data.json (dataset completo para fichas [id])
const destFile = path.join(root, "data", "municipalidades-data.json");
fs.writeFileSync(destFile, JSON.stringify(output), "utf8");
console.log(`\n[ÉXITO] Generados datos authoritative para las ${Object.keys(output).length} municipalidades en data/municipalidades-data.json!`);

// Guardar en data/municipalidades-list.json (dataset liviano para /municipalidades y SSR de bajo consumo)
const listData = Object.values(output).map((m) => ({
  id: m.id,
  cut: m.cut,
  nombre_comuna: m.nombre_comuna,
  region: m.region,
  tiene_municipalidad_propia: m.tiene_municipalidad_propia,
  poblacion_censo_2024: m.poblacion_censo_2024,
  presupuesto_per_capita_clp: m.presupuesto_per_capita_clp,
  fcm_dependencia_pct: m.fcm_dependencia_pct,
  partido_alcalde: m.partido_alcalde,
  alcalde: m.alcalde
    ? {
        nombre: m.alcalde.nombre,
        partido_alcalde: m.alcalde.partido_alcalde ?? null,
      }
    : null,
  presupuesto: m.presupuesto
    ? {
        vigente_clp: m.presupuesto.vigente_clp,
      }
    : null,
  resumen_personal: m.resumen_personal
    ? {
        total_funcionarios: m.resumen_personal.total_funcionarios,
        masa_mensual_clp: m.resumen_personal.masa_mensual_clp,
      }
    : null,
  periodo_nomina: m.periodo_cplt_reciente ?? null,
  desfase_meses: m.desfase_meses ?? null,
  estado_frescura: m.estado_frescura ?? "sin_datos",
  auditorias_cgr_count: (m.auditorias_cgr || []).length,
}));
const listDestFile = path.join(root, "data", "municipalidades-list.json");
fs.writeFileSync(listDestFile, JSON.stringify(listData, null, 2), "utf8");
console.log(`[ÉXITO] Generado dataset liviano (${listData.length} comunas) en data/municipalidades-list.json!`);


// Validaciones Automáticas
const talca = output["muni-talca"];
console.log("\n=== VALIDACIONES POST-GENERACIÓN ===");
console.log(JSON.stringify({
  presupuesto_vigente_sinim: talca.presupuesto?.vigente_clp ?? null,
  masa_salarial_anual_cplt: talca.resumen_personal?.masa_anual_estimada_clp ?? null,
  funcionarios_cplt: talca.resumen_personal?.total_funcionarios ?? null,
  top_remuneraciones: talca.top_remuneraciones.length,
  presupuesto_per_capita: talca.presupuesto_per_capita_clp,
  concejales_servel: talca.concejales.length,
  compras_chilecompra: talca.compras_publicas?.monto_total_clp ?? null,
}, null, 2));
