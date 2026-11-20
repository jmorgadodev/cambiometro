import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PARTIDOS_SEED } from "./partidos";
import { POLITICOS_SEED } from "./politicos";
import { diputadoIdParaPolitico, getGastosParaPolitico, nameSequenceMatches, type EtlRecord } from "./data-source";
import { remuneracionParaPolitico, type RemuneracionParlamentario } from "./remuneraciones";
import type { PersonalApoyoDataset } from "./personal-apoyo";
import { buildDashboardRows, type DashboardData } from "./parliamentary-dashboard";

const notes = ["Partido de la nómina vigente; la comparación no reconstruye afiliación histórica.","Cobertura de la nómina parlamentaria vigente; no representa todo el gasto del Congreso ni todas las autoridades históricas de 2026.", "Gastos: suma de ítems verificables, sin duplicar filas TOTAL. Categorías de lectura propias; se conserva el ítem original.", "Personal y asesorías: contratos/importes publicados; no equivalen a personas únicas y pueden solaparse con asignaciones. El total referencial suma componentes y puede incluir solapamientos; no es gasto consolidado.", "Dieta: última referencia oficial positiva por persona. La interfaz la aplica como estimación fija a cada mes del rango, identificando el mes de origen en el CSV. No acredita pagos mensuales. Los cortes de cada componente son distintos.", "Ausente no equivale a cero. Un total con cobertura parcial sólo suma observaciones con importe; la cobertura indica las autoridades incluidas."];

export async function assembleDashboard(input: {
  camara?: EtlRecord[]; senado?: EtlRecord[]; staff: PersonalApoyoDataset | null;
  salaryLookup?: (name: string) => Promise<RemuneracionParlamentario | null>;
  releaseId: string; mode: DashboardData["mode"];
}): Promise<DashboardData> {
  const members = POLITICOS_SEED.map(p => ({ id: p.id, cargo: p.cargo, nombre_completo: p.nombre_completo, deputyId: diputadoIdParaPolitico(p), partyId: p.partido_id, partyLabel: PARTIDOS_SEED.find(party => party.id === p.partido_id)?.nombre ?? p.partido_id }));
  const expenses = new Map(members.map(m => [m.id, input.camara && input.senado
    ? (m.cargo === "Diputado" ? input.camara.filter(r => String(r.diputado_id) === m.deputyId) : input.senado.filter(r => !!r.nombre && nameSequenceMatches(m.nombre_completo, r.nombre)))
    : getGastosParaPolitico(m)]));
  const salaries = new Map<string, { amount: number; period: string }>();
  for (const m of members) {
    const salary = await (input.salaryLookup ?? remuneracionParaPolitico)(m.nombre_completo);
    if (salary) salaries.set(m.id, { amount: salary.bruto_mensual, period: salary.mes });
  }
  return { members: members.map(m => ({ id: m.id, name: m.nombre_completo, partyId: m.partyId, partyLabel: m.partyLabel, chamber: m.cargo === "Diputado" ? "camara" : "senado" })), rows: buildDashboardRows({ members, expenses, staff: input.staff, salaries }), releaseId: input.releaseId, mode: input.mode, notes };
}

export async function loadParliamentaryDashboard(): Promise<DashboardData> {
  try {
    return await loadVerifiedDashboard();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    // Development can show an unavailable state; publication must fail closed.
    if (!process.env.CAMBIOMETRO_DASHBOARD_LOCAL_DATA && process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY !== "1" && (code === "ENOENT" || code === "ENOSYS")) {
      return { members: [], rows: [], releaseId: null, mode: "unverified", notes: ["El release verificado no está disponible en este entorno. Preparar el bundle local o recuperar los archivos publicados; no se usan datos de respaldo."] };
    }
    throw error;
  }
}

async function loadVerifiedDashboard(): Promise<DashboardData> {
  const local = process.env.CAMBIOMETRO_DASHBOARD_LOCAL_DATA;
  if (local) {
    if (process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY === "1") throw new Error("DASHBOARD_LOCAL_DATA_NOT_ALLOWED_IN_PUBLICATION");
    const bundle = JSON.parse(fs.readFileSync(path.resolve(local), "utf8")) as { sha256: string; data: DashboardData };
    const hash = createHash("sha256").update(JSON.stringify(bundle.data)).digest("hex");
    if (hash !== bundle.sha256 || bundle.data.mode !== "local-verified") throw new Error("DASHBOARD_LOCAL_DATA_CHECKSUM_INVALID");
    return { ...bundle.data, notes };
  }
  const pinPath = path.resolve(".ci-data-version/release-set.json");
  if (!fs.existsSync(pinPath)) return { members: [], rows: [], releaseId: null, mode: "unverified", notes: ["Preparar el bundle local verificado para explorar datos. No se muestran fixtures Git como si fueran datos publicados."] };
  const pin = JSON.parse(fs.readFileSync(pinPath, "utf8"));
  const readPinned = (file: string) => {
    const expected = Object.values(pin.domains as Record<string, { files: { path: string; size: number; checksumSha256: string }[] }>).flatMap(d => d.files).find(f => f.path === file);
    const bytes = fs.readFileSync(path.resolve(file));
    if (!expected || expected.size !== bytes.length || expected.checksumSha256 !== createHash("sha256").update(bytes).digest("hex")) throw new Error(`DASHBOARD_PUBLISHED_INPUT_MISMATCH:${file}`);
    return JSON.parse(bytes.toString("utf8"));
  };
  return assembleDashboard({ camara: readPinned("data/lake-subsets/gastos-camara.subset.json").records, senado: readPinned("data/lake-subsets/gastos-senado.subset.json").records, staff: readPinned("data/personal-apoyo.json"), releaseId: pin.releaseSetId, mode: "published" });
}
