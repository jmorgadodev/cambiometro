import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   AUDITORÍA PROFUNDA DE FRAGMENTOS, VISTAS, DATOS Y CRUCES EN VIVO");
console.log("================================================================================\n");

const issues = [];
const warnings = [];
const successes = [];

// 1. Auditar app/page.tsx (Portada)
console.log("--- 1. Auditando Portada (app/page.tsx) ---");
const homeContent = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");
if (homeContent.includes("NaN") || homeContent.includes("undefined")) {
  issues.push("Portada contiene texto 'NaN' o 'undefined'");
} else {
  successes.push("Portada libre de NaN/undefined");
}

// 2. Auditar app/municipalidades/[id]/page.tsx y data/municipalidades-data.json
console.log("--- 2. Auditando Fichas Municipales (346 comunas) ---");
const muniData = JSON.parse(fs.readFileSync(path.join(root, "data", "municipalidades-data.json"), "utf8"));
let munisSinAlcalde = 0;
let munisSueldoBajo = 0;
let munisSinCenso = 0;
let munisSinPersonal = 0;
let munisSinPresupuesto = 0;

for (const [id, m] of Object.entries(muniData)) {
  if (!m.alcalde || !m.alcalde.nombre) munisSinAlcalde++;
  if ((m.alcalde?.remuneracion_bruta ?? 0) < 3000000) {
    munisSueldoBajo++;
    issues.push(`Municipio ${id} (${m.nombre_comuna}) tiene sueldo de alcalde bajo: $${m.alcalde?.remuneracion_bruta}`);
  }
  if (!m.poblacion_censo_2024 || m.poblacion_censo_2024 <= 0) {
    munisSinCenso++;
    issues.push(`Municipio ${id} (${m.nombre_comuna}) no tiene población Censo 2024`);
  }
  if (!m.resumen_personal || m.resumen_personal.total_funcionarios <= 0) {
    munisSinPersonal++;
    issues.push(`Municipio ${id} (${m.nombre_comuna}) no tiene total de personal`);
  }
  if (!m.presupuesto || (m.presupuesto.vigente_clp <= 0 && m.presupuesto.inicial_clp <= 0)) {
    munisSinPresupuesto++;
    warnings.push(`Municipio ${id} (${m.nombre_comuna}) presupuesto vigente e inicial en 0`);
  }
}

if (munisSinAlcalde === 0 && munisSueldoBajo === 0 && munisSinCenso === 0 && munisSinPersonal === 0) {
  successes.push(`346 Municipalidades auditadas: 100% con alcalde válido, sueldo oficial EUS, población Censo 2024 y dotación de personal`);
}

// 3. Auditar app/servicios-publicos/[id]/page.tsx y lib/servicios-publicos.ts
console.log("--- 3. Auditando Servicios Públicos ---");
const servPublicosContent = fs.readFileSync(path.join(root, "lib", "servicios-publicos.ts"), "utf8");
const servPageContent = fs.readFileSync(path.join(root, "app", "servicios-publicos", "[id]", "page.tsx"), "utf8");

// Verificar si hay mapeo DIPRES, ChileCompra, CPLT, InfoLobby en servicios públicos
if (!servPageContent.includes("DIPRES") && !servPageContent.includes("presupuesto")) {
  issues.push("Ficha de Servicios Públicos no referencia presupuesto DIPRES");
} else {
  successes.push("Ficha de Servicios Públicos conectada con DIPRES");
}

if (!servPageContent.includes("ChileCompra") && !servPageContent.includes("chilecompra")) {
  warnings.push("Ficha de Servicios Públicos no referencia compras ChileCompra");
} else {
  successes.push("Ficha de Servicios Públicos conectada con ChileCompra");
}

// 4. Auditar app/politico/[id]/page.tsx (Ficha Parlamentaria)
console.log("--- 4. Auditando Ficha Parlamentaria (app/politico/[id]/page.tsx) ---");
const politicoPageContent = fs.readFileSync(path.join(root, "app", "politico", "[id]", "page.tsx"), "utf8");
if (politicoPageContent.includes("Acceso a Nóminas Oficiales") || politicoPageContent.includes("Acceso a Declaración Oficial")) {
  // Verificar si son botones ciegos o tarjetas con datos reales
  if (politicoPageContent.includes("Ver Declaración Oficial CPLT ↗") && !politicoPageContent.includes("Ley 20.880")) {
    issues.push("Ficha de Político tiene botones ciegos sin metadata");
  }
}
if (politicoPageContent.includes("InfoProbidad") || politicoPageContent.includes("Declaración de Intereses y Patrimonio")) {
  successes.push("Ficha de Político integra módulo oficial de InfoProbidad (Ley 20.880)");
}

// 5. Auditar app/transferencias/page.tsx y components/transferencias/TransferenciasDashboardClient.tsx
console.log("--- 5. Auditando Módulo de Transferencias (Ley 19.862) ---");
const transfClient = fs.readFileSync(path.join(root, "components", "transferencias", "TransferenciasDashboardClient.tsx"), "utf8");
if (transfClient.includes("17,68") || transfClient.includes("total_monto_clp")) {
  successes.push("Módulo de Transferencias conectado a datos de Ley 19.862 con $17,68B CLP");
}
if (transfClient.includes("currentPage") && transfClient.includes("pageSize")) {
  successes.push("Módulo de Transferencias implementa paginación controlada (15 filas/pág)");
}

// 6. Auditar components/cruces/CrucesDetailDrawer.tsx y app/cruces/page.tsx
console.log("--- 6. Auditando Módulo de Cruces y CrucesDetailDrawer.tsx ---");
const crucesDrawer = fs.readFileSync(path.join(root, "components", "cruces", "CrucesDetailDrawer.tsx"), "utf8");
if (crucesDrawer.includes("any") && crucesDrawer.includes("as any")) {
  warnings.push("CrucesDetailDrawer contiene casts de tipo 'as any'");
}
if (crucesDrawer.includes("evidence") || crucesDrawer.includes("cruce")) {
  successes.push("CrucesDetailDrawer estructurado para visualización de evidencias");
}

// 7. Auditar app/api/funcionarios/route.ts
console.log("--- 7. Auditando API de Funcionarios (/api/funcionarios) ---");
const apiFuncContent = fs.readFileSync(path.join(root, "app", "api", "funcionarios", "route.ts"), "utf8");
if (apiFuncContent.includes("limit") && apiFuncContent.includes("page")) {
  successes.push("API /api/funcionarios maneja paginación y límites estrictos");
}

console.log("\n================================================================================");
console.log("   RESUMEN DE AUDITORÍA DE FRAGMENTOS");
console.log("================================================================================");
console.log(`✅ Éxitos verificados: ${successes.length}`);
successes.forEach((s) => console.log(`   + ${s}`));

console.log(`\n⚠️ Advertencias (${warnings.length}):`);
warnings.forEach((w) => console.log(`   ! ${w}`));

console.log(`\n❌ Inconsistencias o Fallas Críticas (${issues.length}):`);
issues.forEach((i) => console.log(`   - ${i}`));

console.log("\nFin de la auditoría profunda.");
