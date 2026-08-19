import fs from "fs";

const content = fs.readFileSync("lib/funcionarios-source.ts", "utf8");
const lines = content.split("\n");
const jsonLines = lines.filter((l) => l.trim().startsWith('{"id":"func-muni-maipu-real-'));

console.log("Found JSON lines:", jsonLines.length);

const items = jsonLines.map((l) => {
  const trimmed = l.trim().replace(/,$/, "");
  return JSON.parse(trimmed);
});

const stripped = items.map((f) => ({
  id: f.id,
  nombre_completo: f.nombre_completo,
  cargo: f.cargo,
  estamento: f.estamento,
  tipo_contrato: f.tipo_contrato,
  remuneracion_bruta_mensual: f.remuneracion_bruta_mensual,
  fecha_ingreso: f.fecha_ingreso,
  horas_extras_mes_anterior: f.horas_extras_mes_anterior,
  monto_horas_extras_clp: f.monto_horas_extras_clp,
  remuneracion_liquida_mensual: f.remuneracion_liquida_mensual,
  grado_eus: f.grado_eus,
  formacion: f.formacion,
  derecho_horas_extras: f.derecho_horas_extras,
  horas_extras_diurnas_hrs: f.horas_extras_diurnas_hrs,
  horas_extras_nocturnas_hrs: f.horas_extras_nocturnas_hrs,
  horas_extras_festivas_hrs: f.horas_extras_festivas_hrs,
  observaciones: f.observaciones,
}));

const output = `/**
 * funcionarios-source.ts (OPTIMIZADO)
 * Nómina real de Transparencia Activa (portaltransparencia.cl / CPLT)
 */
import type { FuncionarioPublico } from './seed-politicos';

const DEFAULTS = {
  organo_nombre: "Municipalidad de Maipú",
  organo_tipo: "municipalidad" as const,
  region: "Región Metropolitana de Santiago",
  asignaciones_especiales_clp: 0,
  rem_adicionales_clp: 0,
  bonos_incentivos_clp: 0,
  viaticos_clp: 0,
  fecha_termino: "2026-12-31",
  fuente: "portaltransparencia.cl/PortalPdT/pdtta/-/ta/MU163/PR/PCONT",
  fuente_periodo: "Junio 2026",
};

const RAW: any[] = ${JSON.stringify(stripped)};

export const FUNCIONARIOS_REALES_POR_MUNI: Record<string, FuncionarioPublico[]> = {
  "muni-maipu": RAW.map((f) => ({ ...DEFAULTS, ...f })),
};
`;

fs.writeFileSync("lib/funcionarios-source.ts", output, "utf8");
console.log("Original size:", content.length);
console.log("New size:", output.length);
console.log("Saved KB:", ((content.length - output.length) / 1024).toFixed(1));
