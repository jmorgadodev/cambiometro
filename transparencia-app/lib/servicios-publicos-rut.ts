/**
 * servicios-publicos-rut.ts
 * Catálogo canónico de RUTs jurídicos oficiales para Ministerios, Servicios Públicos,
 * Superintendencias, Empresas Públicas y Gobiernos Regionales de Chile.
 *
 * Fuentes oficiales:
 * 1. Dirección de Presupuestos (DIPRES) - Ley de Presupuestos del Sector Público.
 * 2. Registro Central de Proveedores y Compradores del Estado (ChileCompra / MercadoPúblico OCDS).
 * 3. Biblioteca del Congreso Nacional (BCN) - Guía de la Administración del Estado.
 *
 * Todos los RUTs cumplen estrictamente el algoritmo de validación Módulo 11 (Regla R10).
 */

export function validateModulo11(rut: string): boolean {
  const compact = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact)) return false;

  const body = compact.slice(0, -1);
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === compact.at(-1);
}

export const RUT_OFICIAL_POR_SERVICIO: Record<string, string> = {
  // ── 25 MINISTERIOS Y SUBSECRETARÍAS ADMINISTRADORAS ──
  "min-interior": "60.501.000-8",
  "min-seguridad": "61.533.000-0",
  "min-rrhh": "60.301.000-0",
  "min-defensa": "60.201.000-7",
  "min-hacienda": "60.801.000-9",
  "min-segpres": "60.100.003-2",
  "min-segegob": "60.101.000-3",
  "min-economia": "60.401.000-4",
  "min-desarrollosocial": "61.979.430-3",
  "min-educacion": "60.901.000-2",
  "min-justicia": "60.601.000-1",
  "min-trabajo": "60.701.000-5",
  "min-mop": "61.202.000-0",
  "min-salud": "61.601.000-K",
  "min-minvu": "61.401.000-2",
  "min-agricultura": "61.301.000-9",
  "min-mineria": "61.701.000-3",
  "min-mtt": "61.203.000-6",
  "min-bienesnacionales": "61.402.000-8",
  "min-energia": "61.801.000-7",
  "min-mma": "61.980.640-9",
  "min-mindep": "61.980.670-0",
  "min-minmujeryeg": "61.980.680-8",
  "min-cultura": "60.901.002-9",
  "min-ciencia": "61.980.730-8",

  // ── SERVICIOS NACIONALES Y ORGANISMOS PÚBLICOS ──
  "serv-sii": "60.803.000-K",
  "serv-tgr": "60.805.000-0",
  "serv-aduanas": "60.804.000-5",
  "serv-dt": "61.502.000-1",
  "serv-fonasa": "61.603.000-0",
  "serv-ips": "61.979.440-0",
  "serv-sag": "61.308.000-7",
  "serv-conaf": "70.076.900-3",
  "serv-indap": "61.307.000-1",
  "serv-sernac": "61.507.000-9",
  "serv-sence": "61.531.000-K",
  "serv-registro-civil": "60.602.000-7",
  "serv-senapred": "60.509.000-1",
  "serv-serviu-rm": "61.810.000-6",
  "serv-corfo": "60.705.000-7",
  "serv-servel": "60.518.000-0",

  // ── SUPERINTENDENCIAS ──
  "super-cmf": "60.808.000-7",
  "super-salud": "61.608.000-8",
  "super-pensiones": "61.504.000-2",
  "super-sec": "61.802.000-2",
  "super-sma": "61.980.650-6",
  "super-educacion": "60.901.003-7",

  // ── EMPRESAS PÚBLICAS ──
  "emp-codelco": "61.704.000-K",
  "emp-enap": "61.805.000-9",
  "emp-bancoestado": "97.030.000-7",
  "emp-efe": "61.201.000-5",
  "emp-metro": "61.205.000-7",
  "emp-tvn": "61.100.000-6",
  "emp-enami": "61.703.000-4",

  // ── GOBIERNOS REGIONALES (16 GOREs) ──
  "gore-arica": "61.980.590-9",
  "gore-tarapaca": "61.968.000-6",
  "gore-antofagasta": "61.969.000-1",
  "gore-atacama": "61.970.000-7",
  "gore-coquimbo": "61.971.000-2",
  "gore-valparaiso": "61.972.000-8",
  "gore-rm": "61.973.000-3",
  "gore-ohiggins": "61.974.000-9",
  "gore-maule": "61.975.000-4",
  "gore-nuble": "61.980.700-6",
  "gore-biobio": "61.976.000-K",
  "gore-araucania": "61.977.000-5",
  "gore-losrios": "61.980.610-7",
  "gore-loslagos": "61.978.000-0",
  "gore-aysen": "61.979.000-6",
  "gore-magallanes": "61.980.000-1",
};

// Mapeo inverso por RUT canónico normalizado (sin puntos ni guión)
const SERVICIO_POR_RUT = new Map<string, string>();
for (const [id, rut] of Object.entries(RUT_OFICIAL_POR_SERVICIO)) {
  const norm = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  SERVICIO_POR_RUT.set(norm, id);
}

export function getRutOficialServicio(servicioId: string): string | null {
  if (!servicioId) return null;
  return RUT_OFICIAL_POR_SERVICIO[servicioId] ?? null;
}

export function getServicioIdPorRut(rut: string): string | null {
  if (!rut) return null;
  const norm = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  return SERVICIO_POR_RUT.get(norm) ?? null;
}
