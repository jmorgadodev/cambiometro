/**
 * workers/etl/scrapers/mercadopublico.ts
 * Integrador de Órdenes de Compra y Tratos Directos (ChileCompra / Mercado Público Open Data)
 *
 * Ingesta órdenes de compra de alto monto y detecta contrataciones sin competencia.
 *
 * REGLA DE INTEGRIDAD: Mercado Público (www.mercadopublico.cl) requiere API Key
 * (servicio "Convenio Marco") o scraping del buscador para obtener datos reales.
 * Mientras no esté conectado, NO se simulan órdenes de compra inventadas: la función
 * retorna [] y queda a la espera de la fuente real. Nada fake llega a D1.
 */

export interface OrdenCompraMP {
  id: string;
  id_oc: string;
  comprador_nombre: string;
  proveedor_rut: string;
  proveedor_razon_social: string;
  monto_total_clp: number;
  fecha_emision: string;
  tipo_proceso: 'Trato Directo Excepcional' | 'Licitación Pública';
  alerta_trato_directo: boolean;
}

export async function fetchOrdenesCompraMercadoPublico(): Promise<OrdenCompraMP[]> {
  // Fuente real pendiente (API Mercado Público requiere credenciales).
  // Nada inventado: retorna [] hasta implementar la ingesta auténtica.
  console.warn("[ETL] MercadoPúblico: fuente no conectada aún → sin datos (no se inventan órdenes).");
  return [];
}