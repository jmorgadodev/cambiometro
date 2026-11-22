/** Local generated-profile reconciliation against the pinned parliamentary source snapshot. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";
import { buildSenateFinancialOfficeIndex } from "../lib/senate-financial-identity.ts";
import { procesarGastosPolitico } from "../lib/gastos-operacionales.ts";
const raw = JSON.parse(
  fs.readFileSync(
    "artifacts/personal-candidates/baseline-verificada-20261118/candidate.json",
    "utf8",
  ),
);
const members = POLITICOS_SEED.filter((p) => p.cargo === "Senador").map(
  (p) => ({ id: p.id, name: p.nombre_completo }),
);
const index = buildSenateFinancialOfficeIndex(
  members,
  Object.keys(raw.senadores),
);
let checked = 0;
for (const member of members) {
  const office = index.get(member.id);
  if (!office) continue;
  const profile = JSON.parse(
    fs.readFileSync(`data/politico-slices/${member.id}.json`, "utf8"),
  );
  const actual = profile.apoyoSenador?.registros ?? [];
  const expected = raw.senadores[office];
  assert.equal(actual.length, expected.length, member.id);
  assert.deepEqual(
    actual.map((r) => JSON.stringify(r)).sort(),
    expected.map((r) => JSON.stringify(r)).sort(),
    member.id,
  );
  checked++;
}
assert.equal(checked, 50);
const paulina = JSON.parse(
  fs.readFileSync("data/politico-slices/sen-030.json", "utf8"),
);
const rows = paulina.apoyoSenador.registros;
assert.equal(
  rows.filter((r) => r.periodo >= "2026-03" && r.periodo <= "2026-09").length,
  63,
);
assert.equal(rows.length, 73);
assert.equal(paulina.apoyoSenador.total_2026, 120047684);
assert.equal(paulina.apoyoSenador.ultimo_mes, "2026-09");
const castro = JSON.parse(
  fs.readFileSync("data/politico-slices/sen-025.json", "utf8"),
);
const janSep = procesarGastosPolitico(
  castro.gastos.filter(
    (r) =>
      r.fecha?.slice(0, 7) >= "2026-01" && r.fecha.slice(0, 7) <= "2026-09",
  ),
).totalAcumulado;
const marSep = procesarGastosPolitico(
  castro.gastos.filter(
    (r) =>
      r.fecha?.slice(0, 7) >= "2026-03" && r.fecha.slice(0, 7) <= "2026-09",
  ),
).totalAcumulado;
assert.equal(janSep, 66497092);
assert.equal(marSep, 52662768);
assert(
  !castro.gastos.some((r) =>
    /JUAN ENRIQUE CASTRO PRIETO/i.test(r.nombre ?? ""),
  ),
);
const report = {
  status: "passed",
  senateProfiles: checked,
  paulina: {
    records: rows.length,
    selectedRecords: 63,
    total: 120047684,
    lastPeriod: paulina.apoyoSenador.ultimo_mes,
  },
  castro: { janSep, marSep, unrelatedOwnerExcluded: true },
};
fs.writeFileSync(
  "artifacts/identity-normative/generated-profiles-receipt.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
