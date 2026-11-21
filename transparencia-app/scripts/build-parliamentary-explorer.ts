/** Static projection only: reads verified published inputs; no ETL, remote writes, Worker or D1. */
import fs from "node:fs";
import path from "node:path";
import { loadParliamentaryDashboard } from "../lib/parliamentary-dashboard-data";
import {
  buildExplorerData,
  explorerHash,
} from "../lib/parliamentary-explorer-build";
import {
  packExplorer,
  type PartitionData,
} from "../lib/parliamentary-explorer";

async function main() {
  const legacy = await loadParliamentaryDashboard();
  if (!legacy.releaseId || legacy.mode === "unverified")
    throw new Error("EXPLORER_BUILD_REQUIRES_VERIFIED_RELEASE");
  const local = process.env.CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT;
  if (local && process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY === "1")
    throw new Error("EXPLORER_LOCAL_INPUTS_NOT_ALLOWED_IN_PUBLICATION");
  const receipt = local
    ? JSON.parse(fs.readFileSync(path.resolve(local), "utf8"))
    : null;
  if (receipt && receipt.releaseId !== legacy.releaseId)
    throw new Error("EXPLORER_LOCAL_RECEIPT_RELEASE_MISMATCH");
  const pin = receipt
    ? null
    : JSON.parse(fs.readFileSync(".ci-data-version/release-set.json", "utf8"));
  if (pin && pin.releaseSetId !== legacy.releaseId)
    throw new Error("EXPLORER_PIN_RELEASE_MISMATCH");
  const sources: Record<string, string> = {};
  function read(file: string) {
    const expected = receipt
      ? receipt.inputs.find(
          (f: { publishedPath: string }) => f.publishedPath === file,
        )
      : Object.values(
          pin.domains as Record<
            string,
            { files: { path: string; size: number; checksumSha256: string }[] }
          >,
        )
          .flatMap((d) => d.files)
          .find((f) => f.path === file);
    if (!expected) throw new Error(`EXPLORER_SOURCE_NOT_PINNED:${file}`);
    const raw = fs.readFileSync(receipt ? expected.inputPath : file);
    const parsed = JSON.parse(raw.toString());
    const value = parsed.candidate ?? parsed;
    const bytes = parsed.candidate
      ? Buffer.from(JSON.stringify(value) + "\n")
      : raw;
    if (
      bytes.length !== expected.size ||
      explorerHash(bytes) !== expected.checksumSha256
    )
      throw new Error(`EXPLORER_SOURCE_CHECKSUM_MISMATCH:${file}`);
    sources[file] = explorerHash(bytes);
    return value;
  }
  const camara = read("data/lake-subsets/gastos-camara.subset.json");
  const senado = read("data/lake-subsets/gastos-senado.subset.json");
  const staff = read("data/personal-apoyo.json");
  if (receipt) {
    const salary = fs.readFileSync(receipt.salaryPath);
    if (
      explorerHash(salary) !== receipt.salary.projectedSha256 ||
      receipt.salary.releaseId !== legacy.releaseId
    )
      throw new Error("EXPLORER_SALARY_CHECKSUM_MISMATCH");
    sources.dietas = receipt.salary.projectedSha256;
    sources.dietasManifest = receipt.salary.manifestSha256;
  } else {
    sources.dietas = explorerHash(
      fs.readFileSync("data/remuneraciones-38bis.json"),
    );
    sources.dietasManifest = explorerHash(
      fs.readFileSync("data/remuneraciones-38bis-publico-manifest.json"),
    );
  }
  const { data, records, reconciliation } = buildExplorerData({
    legacy,
    camara: camara.records,
    senado: senado.records,
    staff,
    sources,
    snapshotDates: {
      camara:
        typeof camara.generatedAt === "string" ? camara.generatedAt : undefined,
      senado:
        typeof senado.generatedAt === "string" ? senado.generatedAt : undefined,
    },
  });

  const root = path.resolve("public/data/parliamentary-explorer");
  fs.mkdirSync(root, { recursive: true });
  const memberMap = new Map(data.members.map((m) => [m.id, m]));
  const partitions = Map.groupBy(
    records,
    (r) => `${r.period}-${memberMap.get(r.memberId)!.chamber}-${r.component}`,
  );
  for (const [key, rows] of partitions) {
    const body = JSON.stringify({
      schemaVersion: 1,
      releaseId: data.releaseId,
      rows,
    } satisfies PartitionData);
    const sha256 = explorerHash(body);
    const file = `${key}-${sha256.slice(0, 16)}.json`;
    fs.writeFileSync(path.join(root, file), body);
    data.partitions.push({
      path: `/data/parliamentary-explorer/${file}`,
      sha256,
      bytes: Buffer.byteLength(body),
      period: rows[0].period,
      chamber: memberMap.get(rows[0].memberId)!.chamber,
      count: rows.length,
      component: rows[0].component,
    });
  }
  // Clean only owned generated detail files in this local build directory, never source inputs or R2.
  const currentFiles = new Set(
    data.partitions.map((part) => path.basename(part.path)),
  );
  for (const file of fs.readdirSync(root))
    if (
      /^\d{4}-\d{2}-(camara|senado)(-(gastos|personal|asesorias|dieta))?-[a-f0-9]{16}\.json$/.test(
        file,
      ) &&
      !currentFiles.has(file)
    )
      fs.unlinkSync(path.join(root, file));
  data.projectionId = explorerHash(
    JSON.stringify({
      schemaVersion: 1,
      releaseId: data.releaseId,
      sources,
      members: data.members,
      facts: data.facts,
      partitions: data.partitions,
    }),
  );
  const bootstrap = packExplorer(data);
  const body = JSON.stringify(bootstrap);
  fs.writeFileSync(path.join(root, "bootstrap.json"), body);
  fs.writeFileSync(
    path.join(root, "manifest.json"),
    JSON.stringify({
      schemaVersion: 1,
      releaseId: data.releaseId,
      projectionId: data.projectionId,
      bootstrap: {
        path: "/data/parliamentary-explorer/bootstrap.json",
        sha256: explorerHash(body),
        bytes: Buffer.byteLength(body),
      },
      sources,
      partitions: data.partitions,
    }),
  );
  const report = {
    ...reconciliation,
    releaseId: data.releaseId,
    projectionId: data.projectionId,
    members: data.members.length,
    summaryBytes: Buffer.byteLength(body),
    detailBytes: data.partitions.reduce((s, p) => s + p.bytes, 0),
    partitions: data.partitions.length,
    sources,
  };
  fs.mkdirSync("artifacts/dashboard-explorer", { recursive: true });
  fs.writeFileSync(
    "artifacts/dashboard-explorer/projection-receipt.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
