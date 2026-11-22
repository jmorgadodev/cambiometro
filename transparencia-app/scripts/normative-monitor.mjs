/** Read-only official document detection. Never changes approved explanations or publishes data. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export function compareNormativeDocuments(approved, observed) {
  return observed
    .filter(
      (d) => !approved.some((a) => a.url === d.url && a.sha256 === d.sha256),
    )
    .map((d) => ({
      ...d,
      status: "pending-validation",
      affectedConcepts:
        "Review document sections before approving substantive definitions",
    }));
}
export async function monitorNormativeDocuments({
  output = "artifacts/normativa-monitor",
  fetchImpl = fetch,
} = {}) {
  const catalog = JSON.parse(
    fs.readFileSync("data/normativa/catalogo.json", "utf8"),
  );
  const root = path.resolve(output);
  fs.mkdirSync(root, { recursive: true });
  const indexUrl =
    "https://www.consejoresolutivo.cl/regulacion-de-asignaciones/";
  async function read(url, max) {
    if (new URL(url).hostname !== "www.consejoresolutivo.cl")
      throw Error("NORMATIVE_ORIGIN_NOT_ALLOWED");
    const r = await fetchImpl(url, {
      signal: AbortSignal.timeout(30000),
      headers: { "User-Agent": "Cambiometro-Normative-Monitor/1.0" },
    });
    if (!r.ok || new URL(r.url || url).hostname !== "www.consejoresolutivo.cl")
      throw Error("NORMATIVE_SOURCE_UNAVAILABLE");
    const chunks = [];
    let length = 0;
    for await (const chunk of r.body) {
      length += chunk.length;
      if (length > max) throw Error("NORMATIVE_DOCUMENT_TOO_LARGE");
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  const html = (await read(indexUrl, 2000000)).toString("utf8");
  const links = [...html.matchAll(/href=["']([^"']+\.pdf(?:[^"']*)?)["']/gi)]
    .map((m) => new URL(m[1].replaceAll("&amp;", "&"), indexUrl).href)
    .filter((u) => new URL(u).hostname === "www.consejoresolutivo.cl");
  const urls = [
    ...new Set([...catalog.versions.map((v) => v.url), ...links]),
  ].slice(0, 12);
  const observed = [];
  for (const url of urls) {
    const bytes = await read(url, 16000000);
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))
      throw Error("NORMATIVE_PDF_REQUIRED");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    observed.push({ url, sha256, bytes: bytes.length });
    if (!catalog.versions.some((v) => v.url === url && v.sha256 === sha256))
      fs.writeFileSync(path.join(root, sha256 + ".pdf"), bytes);
  }
  const pending = compareNormativeDocuments(catalog.versions, observed).map(
    (d) => ({
      ...d,
      affectedDefinitionIds: [...new Set(catalog.definitions.map((x) => x.id))],
      scopeUncertain: true,
    }),
  );
  const report = {
    checkedAt: new Date().toISOString(),
    catalogVersion: catalog.catalogVersion,
    indexUrl,
    observed,
    pending,
    status: pending.length ? "pending-validation" : "unchanged",
    autoInterpretation: false,
    publicCatalogModified: false,
  };
  fs.writeFileSync(
    path.join(root, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      status: report.status,
      documents: observed.length,
      pending: pending.length,
    }),
  );
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  monitorNormativeDocuments().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
