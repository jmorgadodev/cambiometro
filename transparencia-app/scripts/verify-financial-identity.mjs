/** Local reconciliation of published financial inputs. Reads only; no ETL, network or deployment. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { build } from "esbuild";
import csv from "csv-parser";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--"))
    throw new Error(`Value required for ${name}`);
  return args[index + 1];
};
if (args.includes("--help")) {
  console.log(
    "node scripts/verify-financial-identity.mjs [--receipt artifacts/dashboard-explorer/input/source-receipt.json] [--source cached-published-personal.json] [--from 2026-03] [--to 2026-09] [--projection public/data/parliamentary-explorer/bootstrap.json] [--previous-projection artifacts/identity-normative/previous-bootstrap.json] [--output artifacts/identity-normative/correction-report.json]",
  );
  process.exit(0);
}
const from = option("--from", "2026-03"),
  to = option("--to", "2026-09");
assert(
  /^20\d\d-(0[1-9]|1[0-2])$/.test(from) &&
    /^20\d\d-(0[1-9]|1[0-2])$/.test(to) &&
    from <= to,
  "Invalid month range",
);
const root = path.resolve("artifacts/identity-normative");
fs.mkdirSync(root, { recursive: true });
const output = path.resolve(
  option("--output", "artifacts/identity-normative/correction-report.json"),
);
assert(
  output.startsWith(path.resolve("artifacts") + path.sep),
  "Report must stay inside local artifacts/",
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receipt = JSON.parse(
  fs.readFileSync(
    option(
      "--receipt",
      "artifacts/dashboard-explorer/input/source-receipt.json",
    ),
    "utf8",
  ),
);
const pinned = receipt.inputs.find(
  (input) => input.publishedPath === "data/personal-apoyo.json",
);
assert(pinned, "No published staff input in receipt");
const sourcePath = option("--source", pinned.inputPath),
  originalBytes = fs.readFileSync(sourcePath),
  outer = JSON.parse(originalBytes);
const sourceBytes = outer.candidate
  ? Buffer.from(JSON.stringify(outer.candidate) + "\n")
  : originalBytes;
assert.equal(sourceBytes.length, pinned.size, "Published input bytes differ");
assert.equal(
  sha(sourceBytes),
  pinned.checksumSha256,
  "Published staff checksum differs",
);
const staff = outer.candidate ?? outer;
await build({
  stdin: {
    contents:
      'export {buildMemberSupport} from "./lib/party-support";export {POLITICOS_SEED} from "./lib/politicos-source";export * from "./lib/parliamentary-explorer";export * from "./lib/senate-financial-identity";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: path.join(root, "identity-qa.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
});
const model = createRequire(import.meta.url)(
  path.join(root, "identity-qa.cjs"),
);
const members = model.POLITICOS_SEED.filter((m) => m.cargo === "Senador").map(
  (m) => ({ ...m, deputyId: null }),
);
const officeNames = Object.keys(staff.senadores);
const inRange = (row) => row.periodo >= from && row.periodo <= to;
const key = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim()
    .split(/\s+/);
// Frozen pre-correction rule; only used to quantify the historical omission, never to establish truth for the corrected rows.
function oldOfficeIndex() {
  const candidates = new Map(
    members.map((m) => [
      m.id,
      officeNames.filter(
        (office) =>
          key(m.nombre_completo).length >= 3 &&
          key(m.nombre_completo).every((t) => key(office).includes(t)),
      ),
    ]),
  );
  const claims = new Map();
  for (const candidatesForMember of candidates.values())
    for (const office of candidatesForMember)
      claims.set(office, (claims.get(office) ?? 0) + 1);
  return new Map(
    members.map((m) => {
      const options = candidates.get(m.id);
      return [
        m.id,
        options.length === 1 && claims.get(options[0]) === 1
          ? options[0]
          : null,
      ];
    }),
  );
}
function monthly(rows) {
  const groups = {};
  for (const row of rows) {
    assert(
      Number.isSafeInteger(row.monto) && row.monto >= 0,
      "Invalid original CLP amount",
    );
    const group = (groups[row.periodo] ??= { records: 0, amount: 0 });
    group.records++;
    group.amount += row.monto;
  }
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)),
  );
}
const beforeIndex = oldOfficeIndex(),
  currentIndex = model.buildSenateFinancialOfficeIndex(
    members.map((m) => ({ id: m.id, name: m.nombre_completo })),
    officeNames,
  );
const oldRows = (m) =>
  (staff.senadores[beforeIndex.get(m.id)] ?? []).filter(inRange);
const newRows = (m) =>
  (staff.senadores[currentIndex.get(m.id)] ?? []).filter(inRange);
const alias = model.VERIFIED_SENATE_FINANCIAL_ALIASES.find(
  (a) => a.canonicalId === "sen-030",
);
assert(alias, "Verified alias absent");
assert.equal(
  currentIndex.get(alias.canonicalId),
  alias.publishedName,
  "Original office key not preserved",
);
const recovered = staff.senadores[alias.publishedName].filter(inRange),
  expectedMonths = monthly(recovered),
  support = model.buildMemberSupport(members, staff, from);
assert.deepEqual(
  Object.keys(support[alias.canonicalId])
    .filter((p) => p <= to)
    .sort(),
  Object.keys(expectedMonths),
);
for (const [period, expected] of Object.entries(expectedMonths))
  assert.deepEqual(
    support[alias.canonicalId][period],
    { amount: expected.amount, contracts: expected.records },
    `Raw support mismatch for ${period}`,
  );
const unaffected = [];
for (const member of members.filter((m) => m.id !== alias.canonicalId)) {
  const expected = monthly(oldRows(member));
  const actual = Object.fromEntries(
    Object.entries(support[member.id])
      .filter(([period]) => period <= to)
      .map(([period, snapshot]) => [
        period,
        { records: snapshot.contracts, amount: snapshot.amount },
      ]),
  );
  assert.deepEqual(actual, expected, `Other senator changed: ${member.id}`);
  assert.equal(
    currentIndex.get(member.id),
    beforeIndex.get(member.id),
    `Other office changed: ${member.id}`,
  );
  unaffected.push(member.id);
}
assert.equal(unaffected.length, 49);
if (
  pinned.checksumSha256 ===
    "adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4" &&
  from === "2026-03" &&
  to === "2026-09"
) {
  assert.equal(recovered.length, 63);
  assert.equal(staff.senadores[alias.publishedName].length, 73);
}
const scopes = {
  senado: members,
  psSenado: members.filter((m) => m.partido_id === "ps"),
  mauleSenado: members.filter((m) => /maule/i.test(m.distrito_region)),
};
const aggregateScopes = Object.fromEntries(
  Object.entries(scopes).map(([name, roster]) => [
    name,
    {
      before: monthly(roster.flatMap(oldRows)),
      after: monthly(roster.flatMap(newRows)),
    },
  ]),
);
const assigned = new Set([...currentIndex.values()].filter(Boolean));
const unassociatedOffices = officeNames
  .filter((office) => !assigned.has(office))
  .map((office) => ({
    originalOffice: office,
    records: staff.senadores[office].filter(inRange).length,
    periods: [
      ...new Set(staff.senadores[office].filter(inRange).map((r) => r.periodo)),
    ].sort(),
    reason:
      office === "SENADO - FUERO LABORAL"
        ? "institutional_office_not_individual_senator"
        : "outside_current_50_member_catalog_not_reassigned_without_evidence",
    partialCandidates: members
      .filter(
        (m) =>
          key(m.nombre_completo).filter((t) => key(office).includes(t))
            .length >= 2,
      )
      .map((m) => ({ id: m.id, name: m.nombre_completo })),
  }));
// Bounded check of the financial expense source; classify identities, never add TOTAL rows as expenses.
const expenseInput = receipt.inputs.find(
  (input) =>
    input.publishedPath === "data/lake-subsets/gastos-senado.subset.json",
);
let expenseIdentityCoverage = null;
if (expenseInput) {
  const envelopeBytes = fs.readFileSync(expenseInput.inputPath),
    envelope = JSON.parse(envelopeBytes),
    expenseBytes = envelope.candidate
      ? Buffer.from(JSON.stringify(envelope.candidate) + "\n")
      : envelopeBytes,
    expense = envelope.candidate ?? envelope;
  assert.equal(expenseBytes.length, expenseInput.size);
  assert.equal(sha(expenseBytes), expenseInput.checksumSha256);
  const selected = expense.records.filter(
    (r) =>
      (r.periodo ?? r.fecha?.slice(0, 7) ?? "") >= from &&
      (r.periodo ?? r.fecha?.slice(0, 7) ?? "") <= to,
  );
  const sourceNames = [...new Set(selected.map((r) => r.nombre ?? ""))],
    financialRoster = members.map((m) => ({
      id: m.id,
      name: m.nombre_completo,
    }));
  const owners =
    typeof model.buildSenateFinancialOwnerIndex === "function"
      ? model.buildSenateFinancialOwnerIndex(financialRoster, sourceNames)
      : new Map(
          sourceNames.map((name) => [
            name,
            model.senateFinancialRecordOwner(name, financialRoster),
          ]),
        );
  function legacySequence(seed, record) {
    const a = key(seed),
      b = key(record);
    if (a.length < 2 || b.length < a.length) return false;
    const x = a.at(-1),
      y = b.at(-1);
    if (!(
      x === y ||
      (x.length >= 5 && y.length >= 5 && (x.startsWith(y) || y.startsWith(x)))
    ))
      return false;
    let cursor = 0;
    for (const token of b) {
      const next = a[cursor];
      if (
        token === next ||
        (next &&
          next.length >= 5 &&
          (token.startsWith(next) || next.startsWith(token)))
      )
        cursor++;
    }
    return cursor === a.length;
  }
  const previousOwners = new Map(
    sourceNames.map((name) => [
      name,
      members
        .filter((m) => legacySequence(m.nombre_completo, name))
        .map((m) => m.id),
    ]),
  );
  const changedNames = sourceNames
    .filter((name) => {
      const old = previousOwners.get(name),
        now = owners.get(name);
      return (
        old.length !== Number(Boolean(now)) ||
        (old.length === 1 && old[0] !== now)
      );
    })
    .map((name) => ({
      originalName: name,
      before: previousOwners.get(name),
      after: owners.get(name),
    }));
  expenseIdentityCoverage = {
    sourceSha256: expenseInput.checksumSha256,
    selectedRows: selected.length,
    sourceNames: sourceNames.length,
    associatedRowsBefore: selected.filter(
      (r) => previousOwners.get(r.nombre ?? "").length === 1,
    ).length,
    associatedRowsAfter: selected.filter((r) => owners.get(r.nombre ?? ""))
      .length,
    changedNames,
    unassociatedNames: sourceNames
      .filter((name) => !owners.get(name))
      .map((name) => ({
        originalName: name,
        records: selected.filter((r) => (r.nombre ?? "") === name).length,
        reason: "no_unique_verified_current_catalog_owner",
      })),
    indexComputedOnceForDistinctNames: true,
  };
}
const result = {
  status: "source-reconciled-projection-pending",
  releaseId: receipt.releaseId,
  source: {
    publishedPath: pinned.publishedPath,
    sha256: pinned.checksumSha256,
    bytes: sourceBytes.length,
    snapshotAt: staff.generado_en,
  },
  range: { from, to },
  canonicalId: alias.canonicalId,
  officialSenatorId: alias.officialSenatorId,
  originalOffice: alias.publishedName,
  identitySources: alias.sources,
  recoveredByMonth: expectedMonths,
  recoveredTotal: recovered.reduce((s, r) => s + r.monto, 0),
  recoveredRecords: recovered.length,
  allSourcePeriods: monthly(staff.senadores[alias.publishedName]),
  allSourceRecords: staff.senadores[alias.publishedName].length,
  associationCoverage: {
    currentSenators: members.length,
    officeCount: officeNames.length,
    associatedBefore: [...beforeIndex.values()].filter(Boolean).length,
    associatedAfter: assigned.size,
    associatedRecordsBefore: members.flatMap(oldRows).length,
    associatedRecordsAfter: members.flatMap(newRows).length,
    unassociatedRecords: unassociatedOffices.reduce((s, x) => s + x.records, 0),
    correctedCanonicalIds: [alias.canonicalId],
    unaffectedCanonicalIds: unaffected,
    unassociatedOffices,
  },
  affectedScopes: aggregateScopes,
  expenseIdentityCoverage,
  checks: {
    rawAmounts: true,
    all49OtherSenatorsUnchanged: true,
    originalOfficePreserved: true,
    contractsRemainAdministrativeRecords: true,
  },
  projection: null,
  noETLRun: true,
  noRemoteWrites: true,
};
const projectionPath = option("--projection", null);
if (projectionPath) {
  const bootstrapFile = path.resolve(projectionPath),
    bootstrapBytes = fs.readFileSync(bootstrapFile),
    manifest = JSON.parse(
      fs.readFileSync(
        path.join(path.dirname(bootstrapFile), "manifest.json"),
        "utf8",
      ),
    );
  assert.equal(bootstrapBytes.length, manifest.bootstrap.bytes);
  assert.equal(sha(bootstrapBytes), manifest.bootstrap.sha256);
  const data = model.unpackExplorer(JSON.parse(bootstrapBytes));
  assert.equal(data.releaseId, receipt.releaseId);
  assert.equal(data.projectionId, manifest.projectionId);
  const partitions = data.partitions.filter(
      (p) =>
        p.chamber === "senado" &&
        p.component === "personal" &&
        p.period >= from &&
        p.period <= to,
    ),
    records = [];
  for (const partition of partitions) {
    const bytes = fs.readFileSync(
      path.join(path.dirname(bootstrapFile), path.basename(partition.path)),
    );
    assert.equal(bytes.length, partition.bytes);
    assert.equal(sha(bytes), partition.sha256);
    const part = JSON.parse(bytes);
    assert.equal(part.releaseId, data.releaseId);
    assert.equal(part.rows.length, partition.count);
    records.push(...part.rows.filter((r) => r.memberId === alias.canonicalId));
  }
  const observedMonths = monthly(
    records.map((r) => ({ periodo: r.period, monto: r.amount })),
  );
  assert.deepEqual(
    observedMonths,
    expectedMonths,
    "Detail partition rows differ from original staff rows",
  );
  assert.equal(
    new Set(records.map((r) => r.id)).size,
    records.length,
    "Repeated observation IDs",
  );
  assert(
    records.every((r) => r.sourceOffice === alias.publishedName),
    "Source office label missing or altered in a detail record",
  );
  const signature = (r) =>
    JSON.stringify([
      r.periodo,
      r.monto,
      [r.nombre, r.apellido_paterno, r.apellido_materno]
        .filter(Boolean)
        .join(" "),
      r.cargo,
      r.calidad_juridica,
    ]);
  const sourceSignatures = recovered.map(signature).sort(),
    detailSignatures = records
      .map((r) =>
        JSON.stringify([
          r.period,
          r.amount,
          r.personName,
          r.originalRole,
          r.contractType,
        ]),
      )
      .sort();
  assert.deepEqual(
    detailSignatures,
    sourceSignatures,
    "Original row values or multiplicity altered",
  );
  const q = {
    ...model.explorerDefaults(data),
    from,
    to,
    memberIds: [alias.canonicalId],
    member: "todos",
    component: "personal",
    componentIds: ["personal"],
    metricComponent: "personal",
  };
  assert.equal(
    model.explorerMetrics(data, q).components.personal.amount,
    result.recoveredTotal,
  );
  const parsed = [];
  const csvText = model.explorerCsv(data, records);
  await new Promise((resolve, reject) =>
    Readable.from([Buffer.from(csvText)])
      .pipe(
        csv({
          separator: ";",
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, ""),
        }),
      )
      .on("data", (r) => parsed.push(r))
      .on("end", resolve)
      .on("error", reject),
  );
  assert.equal(parsed.length, recovered.length);
  assert.equal(
    parsed.reduce((s, r) => s + Number(r["Monto CLP"]), 0),
    result.recoveredTotal,
  );
  assert.equal(
    csvText.split(alias.publishedName).length - 1,
    recovered.length,
    "Original office label not preserved once per CSV row",
  );
  for (const [scope, roster] of Object.entries(scopes)) {
    const ids = new Set(roster.map((m) => m.id)),
      expected = aggregateScopes[scope].after;
    const amountRows = data.facts.filter(
      (f) =>
        f.component === "personal" &&
        ids.has(f.memberId) &&
        f.period >= from &&
        f.period <= to,
    );
    const actual = {};
    for (const f of amountRows) {
      const g = (actual[f.period] ??= { records: 0, amount: 0 });
      g.records += f.recordCount;
      g.amount += f.amount ?? 0;
    }
    assert.deepEqual(
      actual,
      expected,
      `Projected ${scope} differs from raw normalized source`,
    );
  }
  const previousFile = option(
      "--previous-projection",
      "artifacts/identity-normative/previous-bootstrap.json",
    ),
    previous = model.unpackExplorer(
      JSON.parse(fs.readFileSync(previousFile, "utf8")),
    );
  assert.equal(
    previous.sources["data/personal-apoyo.json"],
    data.sources["data/personal-apoyo.json"],
  );
  const summary = (dataset, ids) => {
    const byKey = {};
    for (const f of dataset.facts.filter((f) => ids.has(f.memberId))) {
      const k = [f.memberId, f.period, f.component].join("|");
      byKey[k] = (byKey[k] ?? 0) + (f.amount ?? 0);
    }
    return byKey;
  };
  const allOtherIds = new Set(
    data.members.filter((m) => m.id !== alias.canonicalId).map((m) => m.id),
  );
  assert.deepEqual(
    summary(data, allOtherIds),
    summary(previous, allOtherIds),
    "Another parliamentarian financial amount changed",
  );
  const allScopes = {
    congreso: data.members,
    ps: data.members.filter((m) => m.partyId === "ps"),
    maule: data.members.filter((m) => m.regionId === "maule"),
    senado: data.members.filter((m) => m.chamber === "senado"),
  };
  result.projection = {
    projectionId: data.projectionId,
    bootstrapSha256: manifest.bootstrap.sha256,
    records: records.length,
    csvRecords: parsed.length,
    csvAmount: result.recoveredTotal,
    sourceOfficePreserved: true,
    noDoubleCount: true,
    all204OtherMembersUnchanged: true,
    scopes: Object.fromEntries(
      Object.entries(allScopes).map(([name, roster]) => {
        const ids = new Set(roster.map((m) => m.id));
        const values = (dataset) => {
          const values = {};
          for (const f of dataset.facts.filter(
            (f) =>
              f.component === "personal" &&
              ids.has(f.memberId) &&
              f.period >= from &&
              f.period <= to,
          ))
            values[f.period] = (values[f.period] ?? 0) + (f.amount ?? 0);
          return values;
        };
        const before = values(previous),
          after = values(data);
        for (const [period, delta] of Object.entries(expectedMonths))
          assert.equal(
            (after[period] ?? 0) - (before[period] ?? 0),
            delta.amount,
            `Unexpected delta ${name}/${period}`,
          );
        return [name, { before, after }];
      }),
    ),
  };
  result.checks = {
    ...result.checks,
    partitionIntegrity: true,
    rawRecordMultiplicity: true,
    csv: true,
    institutionPartyRegion: true,
    all204OthersUnchanged: true,
  };
  result.status = "complete";
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    status: result.status,
    recoveredRecords: result.recoveredRecords,
    recoveredTotal: result.recoveredTotal,
    associatedAfter: result.associationCoverage.associatedAfter,
    unassociatedRecords: result.associationCoverage.unassociatedRecords,
    projection: result.projection?.projectionId ?? null,
    output,
  }),
);
