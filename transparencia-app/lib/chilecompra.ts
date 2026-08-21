import fs from "fs";
import path from "path";
import { legalEntityIdFromRut } from "./legal-rut";

export interface ChileCompraAdjudicacion {
  title: string | null;
  proveedor: string | null;
  proveedor_id: string | null;
  monto_clp: number | null;
  fecha: string | null;
  url: string | null;
  ocid: string;
  status_detail: string | null;
}

export interface ChileCompraMes {
  period: string;
  monto_total_clp: number | null;
  procesos: number;
}

export interface ChileCompraComprador {
  id: string;
  name: string | null;
  rut_juridico: string | null;
  monto_total_clp: number | null;
  procesos: number;
  months: ChileCompraMes[];
  top: ChileCompraAdjudicacion[];
}

export interface ChileCompraProveedor {
  id: string;
  name: string;
  monto_total_clp: number;
  procesos: number;
  buyers: number;
}

export interface ChileCompraPar {
  buyerId: string;
  provId: string;
  monto_total_clp: number;
  procesos: number;
}

export interface ChileCompraProyeccion {
  generatedAt: string;
  source: string;
  buyers: ChileCompraComprador[];
  suppliers: ChileCompraProveedor[];
  topPairs: ChileCompraPar[];
  total_adjudicado_clp: number | null;
}

let cached: ChileCompraProyeccion | null = null;

/**
 * Proyección v1 de adjudicaciones ChileCompra OCDS (generada por
 * scripts/build-chilecompra-v1.mjs desde las particiones del lake: awards con
 * monto, unidos a su licitación/tender por ocid para recuperar el comprador).
 * Aprovisiona la ficha del comprador, el grafo de adjudicaciones y los rankings
 * de /cruces. Carga con fs + cache.
 */
export function leerChileCompraV1(): ChileCompraProyeccion | null {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "data", "lake", "projections", "v1", "chilecompra.json");
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as ChileCompraProyeccion;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export function chilecompraParaComprador(compradorId: string): ChileCompraComprador | null {
  return leerChileCompraV1()?.buyers.find((buyer) => buyer.id === compradorId) ?? null;
}

export function chilecompraParaCompradorPorRut(rutJuridico: string): ChileCompraComprador | null {
  const buyers = leerChileCompraV1()?.buyers;
  if (!buyers || buyers.length === 0) return null;
  const entityId = legalEntityIdFromRut(rutJuridico);
  if (!entityId) return null;
  const compact = entityId.replace("legal-cl-", "").toUpperCase();
  return buyers.find((buyer) => String(buyer.rut_juridico ?? "").replace(/[^0-9kK]/g, "").toUpperCase() === compact) ?? null;
}

export function chilecompraParaProveedor(proveedorId: string): ChileCompraProveedor | null {
  return leerChileCompraV1()?.suppliers.find((supplier) => supplier.id === proveedorId) ?? null;
}
