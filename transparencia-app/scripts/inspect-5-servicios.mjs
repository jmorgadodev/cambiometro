import fs from "fs";
import path from "path";

// Load datasets directly
const dataDir = path.join(process.cwd(), "data");
const lakeDir = path.join(dataDir, "lake", "projections", "v1");

const presupuestoData = JSON.parse(fs.readFileSync(path.join(lakeDir, "presupuesto.json"), "utf8"));
const chilecompraData = JSON.parse(fs.readFileSync(path.join(lakeDir, "chilecompra.json"), "utf8"));

// Import modules
import { SERVICIOS_PUBLICOS_SEED, getServicioPublicoById } from "../lib/servicios-publicos.ts";
import { getRutOficialServicio } from "../lib/servicios-publicos-rut.ts";
import { PRESUPUESTO_CONFIG_POR_SERVICIO, presupuestoParaServicio } from "../lib/presupuesto.ts";
import { getServicioPublicoEnriquecido } from "../lib/servicios-publicos-data.ts";
import { getOrganismoById } from "../lib/organismos.ts";

const sample = [
  { id: 'serv-sence', name: 'SENCE', partida: '8', capitulo: '4' },
  { id: 'serv-fonasa', name: 'FONASA', partida: '11', capitulo: '2' },
  { id: 'serv-sii', name: 'SII', partida: '5', capitulo: '4' },
  { id: 'min-salud', name: 'MINSAL', partida: '11', capitulo: '1' },
  { id: 'min-mop', name: 'MOP', partida: '12', capitulo: '1' }
];

console.log("=== INSPECCIÓN DE 5 SERVICIOS PÚBLICOS (RONDA 2) ===");
for (const item of sample) {
  const serv = getServicioPublicoById(item.id);
  const rut = getRutOficialServicio(item.id);
  const pcfg = PRESUPUESTO_CONFIG_POR_SERVICIO[item.id];
  const p = presupuestoParaServicio(item.id);
  const enriched = getServicioPublicoEnriquecido(item.id);
  const org = getOrganismoById(item.id);

  console.log(`\n======================================================`);
  console.log(`📌 ${serv?.nombre} (${serv?.sigla}) [ID: ${item.id}]`);
  console.log(`- Tipo de Órgano: ${serv?.tipo_organo}`);
  console.log(`- Ministerio Dependiente: ${serv?.ministerio_dependiente}`);
  console.log(`- Titular / Director: ${serv?.director_jefe_actual}`);
  console.log(`- Fuente Titular: ${serv?.fuente_director ?? 'sitio oficial / BCN'}`);
  console.log(`- RUT Oficial: ${rut ?? 'NO ASIGNADO'}`);
  console.log(`- Presupuesto Config: Partida ${pcfg?.partida}${pcfg?.capitulo ? ', Capítulo ' + pcfg.capitulo : ''}`);
  if (p) {
    console.log(`- Presupuesto Inicial (Ley 21.796): $${p.inicial_ley_clp.toLocaleString("es-CL")}`);
    console.log(`- Presupuesto Vigente: $${p.vigente_clp.toLocaleString("es-CL")}`);
    console.log(`- Presupuesto Ejecutado: $${p.ejecutado_clp.toLocaleString("es-CL")}`);
    console.log(`- % Avance / Ejecución: ${p.porcentaje_ejecucion.toFixed(1)}%`);
    console.log(`- Período / Fuente: ${p.ultimo_periodo} · ${p.fuente_url}`);
  } else {
    console.log(`- Presupuesto: — (Sin proyección específica en Lake)`);
  }

  if (enriched?.personal) {
    console.log(`- Dotación CPLT TA: ${enriched.personal.dotacion_total ?? '—'} personas`);
    console.log(`- Gasto Mensual Personal: $${(enriched.personal.gasto_mensual_clp ?? 0).toLocaleString("es-CL")}`);
  } else {
    console.log(`- Dotación CPLT TA: —`);
  }

  if (enriched?.compras) {
    console.log(`- Compras MercadoPúblico: $${(enriched.compras.monto_total_clp ?? 0).toLocaleString("es-CL")} en ${enriched.compras.procesos_count} procesos`);
  } else {
    console.log(`- Compras MercadoPúblico: —`);
  }
}
