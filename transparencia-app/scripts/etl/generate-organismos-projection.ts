import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SERVICIOS_PUBLICOS_SEED } from "../../lib/servicios-publicos";
import { PRESUPUESTO_CONFIG_POR_SERVICIO } from "../../lib/presupuesto";
import { findBuyerByVerifiedRut } from "./r10-chilecompra.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

export interface OrganismoCanonico {
  id: string;
  organismo_id_cplt: string;
  nombre_canonico: string;
  sigla?: string;
  tipo: "Municipalidad" | "Ministerio" | "Subsecretaría" | "Servicio" | "GORE" | "Empresa pública" | "Superintendencia";
  partida_capitulo_dipres: string | null;
  cut_si_municipio: string | null;
  region: string | null;
  dotacion_total: number | null;
  gasto_mensual_estimado_clp: number | null;
  compras_ocds_monto_clp: number | null;
  compras_ocds_procesos: number | null;
  compras_ocds_rut_comprador: string | null;
  compras_ocds_metodo_enlace: "RUT_EXACTO" | null;
  director_jefe_actual?: string;
  fuente_director?: string;
  sitio_web_oficial?: string;
  ministerio_dependiente?: string;
}

function cleanStr(str: string | undefined | null): string {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function run() {
  console.log("==> Iniciando generación de registro canónico de organismos...");

  // 1. Cargar manifest CPLT para dotaciones municipales
  const manifestPath = path.join(rootDir, "data/lake-cplt/projections/funcionarios-v1/manifest.json");
  const cpltCoverageMap = new Map<string, number>();
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      for (const cov of manifest.coverage || []) {
        if (cov.communeId && cov.recordCount > 0) {
          cpltCoverageMap.set(cov.communeId, cov.recordCount);
        }
      }
      console.log(`[CPLT] Cobertura cargada: ${cpltCoverageMap.size} municipalidades con registros.`);
    } catch (e) {
      console.warn("[CPLT] No se pudo leer manifest.json:", e);
    }
  }

  // 2. Cargar ChileCompra
  const ccPath = path.join(rootDir, "data/lake/projections/v1/chilecompra.json");
  let ccBuyers: Array<{ name?: string | null; rut_juridico?: string | null; monto_total_clp?: number | null; procesos?: number | null }> = [];
  if (fs.existsSync(ccPath)) {
    try {
      const cc = JSON.parse(fs.readFileSync(ccPath, "utf8"));
      ccBuyers = cc.buyers || [];
      console.log(`[ChileCompra] Compradores cargados: ${ccBuyers.length} registros.`);
    } catch (e) {
      console.warn("[ChileCompra] Error leyendo chilecompra.json:", e);
    }
  }

  function matchChileCompra(rutJuridico?: string | null) {
    const matched = findBuyerByVerifiedRut(ccBuyers, rutJuridico);
    return matched
      ? {
          monto: matched.monto_total_clp ?? null,
          procesos: matched.procesos ?? null,
          rut: matched.rut_juridico ?? null,
          metodo: "RUT_EXACTO" as const,
        }
      : { monto: null, procesos: null, rut: null, metodo: null };
  }

  const catalog: OrganismoCanonico[] = [];
  const registeredIds = new Set<string>();

  // 3. Cargar Municipalidades desde municipalidades-data.json
  const munisDataPath = path.join(rootDir, "data/municipalidades-data.json");
  if (fs.existsSync(munisDataPath)) {
    const munisData = JSON.parse(fs.readFileSync(munisDataPath, "utf8")) as Record<string, {
      nombre_comuna?: string;
      poblacion_censo_2024?: number;
      cut?: string;
      region?: string;
      alcalde?: { nombre?: string };
      sitio_web_oficial?: string;
    }>;
    for (const [muniId, muni] of Object.entries(munisData)) {
      const cpltId = muniId;
      const dotacion = cpltCoverageMap.get(muniId) ?? null;
      const nombreCanonico = `Municipalidad de ${muni.nombre_comuna || muniId.replace("muni-", "")}`;
      const cc = matchChileCompra((muni as { rut_juridico?: string | null }).rut_juridico);

      catalog.push({
        id: muniId,
        organismo_id_cplt: cpltId,
        nombre_canonico: nombreCanonico,
        tipo: "Municipalidad",
        partida_capitulo_dipres: null,
        cut_si_municipio: muni.cut || null,
        region: muni.region || null,
        dotacion_total: dotacion,
        gasto_mensual_estimado_clp: null,
        compras_ocds_monto_clp: cc.monto,
        compras_ocds_procesos: cc.procesos,
        compras_ocds_rut_comprador: cc.rut,
        compras_ocds_metodo_enlace: cc.metodo,
        director_jefe_actual: muni.alcalde?.nombre || undefined,
        fuente_director: muni.alcalde?.nombre ? "CPLT / SERVEL Elecciones Municipales" : undefined,
        sitio_web_oficial: muni.sitio_web_oficial || undefined,
        ministerio_dependiente: "Municipalidades de Chile (SUBDERE)",
      });
      registeredIds.add(muniId);
    }
  }
  console.log(`[Organismos] ${catalog.length} municipalidades procesadas.`);

  // 4. Agregar Servicios Públicos, Ministerios, GOREs, Superintendencias y Empresas Públicas (SERVICIOS_PUBLICOS_SEED)
  for (const serv of SERVICIOS_PUBLICOS_SEED) {
    const dipresConfig = PRESUPUESTO_CONFIG_POR_SERVICIO[serv.id];
    let dipresCode: string | null = null;
    if (dipresConfig) {
      if (dipresConfig.capitulo) {
        dipresCode = `${dipresConfig.partida.padStart(2, "0")}/${dipresConfig.capitulo.padStart(2, "0")}`;
      } else if (dipresConfig.programa) {
        dipresCode = `${dipresConfig.partida.padStart(2, "0")}/prog-${dipresConfig.programa.padStart(2, "0")}`;
      } else {
        dipresCode = dipresConfig.partida.padStart(2, "0");
      }
    }

    let tipo: OrganismoCanonico["tipo"] = "Servicio";
    if (serv.tipo_organo === "Ministerio") tipo = "Ministerio";
    else if (serv.tipo_organo === "Gobierno Regional") tipo = "GORE";
    else if (serv.tipo_organo === "Superintendencia") tipo = "Superintendencia";
    else if (serv.tipo_organo === "Empresa Pública") tipo = "Empresa pública";

    const cc = matchChileCompra((serv as { rut_juridico?: string | null }).rut_juridico);

    catalog.push({
      id: serv.id,
      organismo_id_cplt: `org-${serv.id.replace(/^(min|serv|gore|super|emp)-/, "")}`,
      nombre_canonico: serv.nombre,
      sigla: serv.sigla,
      tipo,
      partida_capitulo_dipres: dipresCode,
      cut_si_municipio: null,
      region: tipo === "GORE" ? serv.nombre.replace("Gobierno Regional de ", "").replace("Gobierno Regional del ", "") : null,
      dotacion_total: null,
      gasto_mensual_estimado_clp: null,
      compras_ocds_monto_clp: cc.monto,
      compras_ocds_procesos: cc.procesos,
      compras_ocds_rut_comprador: cc.rut,
      compras_ocds_metodo_enlace: cc.metodo,
      director_jefe_actual: serv.director_jefe_actual,
      fuente_director: serv.fuente_director,
      sitio_web_oficial: serv.sitio_web_oficial,
      ministerio_dependiente: serv.ministerio_dependiente,
    });
    registeredIds.add(serv.id);
  }

  // 5. Cargar organismos adicionales de raw/transparencia_activa/organismos_adicionales.json
  const orgAdicPath = path.join(rootDir, "data/raw/transparencia_activa/organismos_adicionales.json");
  if (fs.existsSync(orgAdicPath)) {
    try {
      const orgsAdic = JSON.parse(fs.readFileSync(orgAdicPath, "utf8"));
      for (const org of orgsAdic) {
        const id = org.id || `org-${cleanStr(org.nombre).replace(/\s+/g, "-")}`;
        if (registeredIds.has(id)) continue;

        let tipo: OrganismoCanonico["tipo"] = "Servicio";
        const n = cleanStr(org.nombre);
        if (n.includes("subsecretaria")) tipo = "Subsecretaría";
        else if (n.includes("delegacion presidencial regional") || n.includes("delegacion presidencial provincial")) tipo = "Servicio";
        else if (n.includes("superintendencia")) tipo = "Superintendencia";
        else if (n.includes("gobierno regional") || n.includes("gore")) tipo = "GORE";
        else if (n.includes("empresa") || n.includes("ferrocarril") || n.includes("astillero") || n.includes("puerto")) tipo = "Empresa pública";

        const cc = matchChileCompra(org.rut_juridico);

        catalog.push({
          id,
          organismo_id_cplt: org.id || id,
          nombre_canonico: org.nombre,
          sigla: org.sigla,
          tipo,
          partida_capitulo_dipres: null,
          cut_si_municipio: null,
          region: typeof org.region === "string" && org.region.trim() ? org.region.trim() : null,
          dotacion_total: null,
          gasto_mensual_estimado_clp: null,
          compras_ocds_monto_clp: cc.monto,
          compras_ocds_procesos: cc.procesos,
          compras_ocds_rut_comprador: cc.rut,
          compras_ocds_metodo_enlace: cc.metodo,
          director_jefe_actual: org.director_jefe_actual,
          fuente_director: org.fuente_director,
          sitio_web_oficial: org.sitio_web_oficial,
          ministerio_dependiente: org.ministerio_dependiente,
        });
        registeredIds.add(id);
      }
      console.log(`[Organismos] Total tras organismos adicionales: ${catalog.length} instituciones.`);
    } catch (e) {
      console.warn("[Organismos] Error leyendo organismos_adicionales.json:", e);
    }
  }

  // 6. Validar conteos y guardar artefacto canónico
  const targetPath = path.join(rootDir, "data/lake/projections/v1/organismos.json");
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(catalog, null, 2), "utf8");

  console.log(`✅ Archivo generado exitosamente: ${targetPath}`);
  console.log(`   Total instituciones registradas: ${catalog.length}`);
  const conDipres = catalog.filter((o) => o.partida_capitulo_dipres !== null).length;
  console.log(`   Instituciones con código DIPRES: ${conDipres}`);
  const conDotacion = catalog.filter((organismo) => organismo.dotacion_total !== null);
  const totalDotacion = conDotacion.reduce((acc, organismo) => acc + (organismo.dotacion_total ?? 0), 0);
  console.log(`   Dotación oficial disponible: ${conDotacion.length}/${catalog.length} instituciones (${totalDotacion.toLocaleString("es-CL")} registros).`);
}

run();
