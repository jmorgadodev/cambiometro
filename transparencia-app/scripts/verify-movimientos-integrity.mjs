import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const load = (file) => readFile(resolve(root, file), "utf8").then(JSON.parse);

const policy = await load("data/movimientos-scope-policy.json");
const payload = await load("data/movimientos.json");
const movements = Array.isArray(payload.movimientos) ? payload.movimientos : [];

function roleCategory(movement) {
  const cargo = String(movement.cargo ?? "");
  if (/^Ministr[oa]\b/i.test(cargo) && !/ministerial|biministro/i.test(cargo)) return "ministers";
  if (/^Subsecretari[oa]\b/i.test(cargo)) return "subsecretaries";
  if (/^(?:Secretari[oa] Regional Ministerial|Seremi)\b/i.test(cargo)) return "seremis";
  if (/^Delegad[oa] Presidencial (?:Regional|Provincial)\b/i.test(cargo)) return "delegados";
  return null;
}

function inScope(movement) {
  return movement.fecha >= policy.scopeStartDate
    && movement.fecha <= policy.cutoffDate
    && policy.allowedEventTypes.includes(movement.tipo_evento)
    && roleCategory(movement) !== null;
}

const inScopeRows = movements.filter(inScope);
const outOfScopeRows = movements.filter((movement) => !inScope(movement));
const categoryCounts = inScopeRows.reduce((counts, movement) => {
  const category = roleCategory(movement);
  counts[category] = (counts[category] ?? 0) + 1;
  return counts;
}, {});
const duplicateIds = movements.map((movement) => movement.id).filter((id, index, ids) => ids.indexOf(id) !== index);
const incidentIds = ["mov-046", "mov-047", "mov-048", "mov-050", "mov-065", "mov-087"];
const incidents = movements
  .filter((movement) => incidentIds.includes(movement.id))
  .map((movement) => ({
    id: movement.id,
    name: movement.salio?.nombre ?? movement.saliente ?? null,
    cargo: movement.cargo ?? null,
    fecha: movement.fecha ?? null,
    estado: movement.estado ?? null,
    officialSources: (movement.fuentes ?? []).filter((source) => source.nivel === "oficial").map((source) => source.url),
  }));

const report = {
  generatedAt: new Date().toISOString(),
  pipeline: payload.pipeline,
  policy,
  observed: {
    total: movements.length,
    inScope: inScopeRows.length,
    outOfScope: outOfScopeRows.length,
    categoryCounts,
    duplicateIds,
    incidents,
  },
  decision: {
    status: policy.status === "validated_reference" && inScopeRows.length === 46 && outOfScopeRows.length === 0 && duplicateIds.length === 0
      ? "validated_reference"
      : "blocked",
    reason: policy.status === "validated_reference"
      ? "Release de 46 salidas documentadas hasta el 14-09-2026; cada fila conserva referencia pública y queda pendiente de instrumento primario para promoción oficial."
      : "No existe todavía un release de 46 filas reconciliado con el alcance definido.",
    etlFrozen: true,
    productionMutation: false,
  },
};

console.log(JSON.stringify(report, null, 2));
if (report.decision.status === "blocked" && process.env.MOVIMIENTOS_INTEGRITY_ALLOW_UNRECONCILED !== "1") process.exitCode = 1;
