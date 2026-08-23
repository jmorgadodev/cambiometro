import fs from "fs";
import path from "path";
import organismosStaticJson from "@/data/lake-subsets/organismos.subset.json";

export type TipoOrganismo =
  | "Municipalidad"
  | "Ministerio"
  | "Subsecretaría"
  | "Servicio"
  | "GORE"
  | "Empresa pública"
  | "Superintendencia";

export interface OrganismoCanonico {
  id: string;
  organismo_id_cplt: string;
  nombre_canonico: string;
  sigla?: string;
  tipo: TipoOrganismo;
  partida_capitulo_dipres: string | null;
  cut_si_municipio: string | null;
  region: string | null;
  dotacion_total: number | null;
  gasto_mensual_estimado_clp: number | null;
  compras_ocds_monto_clp: number | null;
  compras_ocds_procesos: number | null;
  compras_ocds_rut_comprador?: string | null;
  compras_ocds_metodo_enlace?: "RUT_EXACTO" | null;
  director_jefe_actual?: string;
  fuente_director?: string;
  sitio_web_oficial?: string;
  ministerio_dependiente?: string;
}

let cachedAllOrganismos: OrganismoCanonico[] | null = null;

function enforceR10(organismos: OrganismoCanonico[]): OrganismoCanonico[] {
  return organismos.map((organismo) => {
    if (organismo.compras_ocds_metodo_enlace === "RUT_EXACTO" && organismo.compras_ocds_rut_comprador) {
      return organismo;
    }
    return {
      ...organismo,
      compras_ocds_monto_clp: null,
      compras_ocds_procesos: null,
      compras_ocds_rut_comprador: null,
      compras_ocds_metodo_enlace: null,
    };
  });
}

function loadAllOrganismos(): OrganismoCanonico[] {
  if (cachedAllOrganismos) return cachedAllOrganismos;
  try {
    const orgPath = path.join(process.cwd(), "data", "lake", "projections", "v1", "organismos.json");
    if (fs.existsSync(orgPath)) {
      cachedAllOrganismos = enforceR10(JSON.parse(fs.readFileSync(orgPath, "utf8")) as OrganismoCanonico[]);
      return cachedAllOrganismos;
    }
  } catch {}
  cachedAllOrganismos = enforceR10((organismosStaticJson as unknown) as OrganismoCanonico[]);
  return cachedAllOrganismos;
}

export function getAllOrganismos(): OrganismoCanonico[] {
  return loadAllOrganismos();
}

export function getOrganismoById(id: string): OrganismoCanonico | undefined {
  if (!id) return undefined;
  const list = loadAllOrganismos();
  return list.find((o) => o.id === id || o.id.toLowerCase() === id.toLowerCase());
}

export function getOrganismoByCpltId(cpltId: string): OrganismoCanonico | undefined {
  if (!cpltId) return undefined;
  const list = loadAllOrganismos();
  return list.find((o) => o.organismo_id_cplt === cpltId || o.organismo_id_cplt.toLowerCase() === cpltId.toLowerCase());
}

export function getOrganismosByTipo(tipo: TipoOrganismo | "Todos"): OrganismoCanonico[] {
  const list = loadAllOrganismos();
  if (tipo === "Todos") return list;
  return list.filter((o) => o.tipo === tipo);
}

export function getOrganismosStats() {
  const list = loadAllOrganismos();
  const total = list.length;
  const porTipo: Record<string, number> = {};
  let totalDotacion = 0;
  let totalComprasMonto = 0;
  let conDipres = 0;

  for (const o of list) {
    porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1;
    totalDotacion += o.dotacion_total || 0;
    totalComprasMonto += o.compras_ocds_monto_clp || 0;
    if (o.partida_capitulo_dipres) conDipres++;
  }

  return {
    total,
    porTipo,
    totalDotacion,
    totalComprasMonto,
    conDipres,
  };
}
