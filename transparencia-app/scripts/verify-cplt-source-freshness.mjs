import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  CPLT_SOURCES,
  compareCpltSourceValidators,
  currentSourceValidator,
  sourceUrls,
} from "./etl/cplt-source-freshness.mjs";

const root = resolve(import.meta.dirname, "..");
const bucket = process.env.CPLT_R2_BUCKET?.trim() || "transparencia-public-data";
const remoteManifestKey = "projections/funcionarios-v1/manifest.json";
const outputPath = process.env.GITHUB_OUTPUT || null;
const userAgent = "cambiometro-etl/1.0 (+https://cambiometro.impulsacv.cl)";

if (!process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || !process.env.CLOUDFLARE_API_TOKEN?.trim()) {
  throw new Error("CPLT_FRESHNESS_CREDENTIALS_MISSING");
}

function writeOutput(values) {
  if (!outputPath) return;
  writeFileSync(outputPath, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`, { flag: "a" });
}

function wrangler(args) {
  const bin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
  return spawnSync(process.execPath, [bin, ...args, "--remote"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
}

async function inspect(source) {
  let lastError = null;
  for (const url of sourceUrls(source)) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { Accept: "text/csv,*/*", "User-Agent": userAgent },
      });
      if (!response.ok) throw new Error(`${url} -> HEAD ${response.status}`);
      const validator = currentSourceValidator(response);
      if (!validator) throw new Error(`${url} -> falta ETag/Last-Modified`);
      return { sourceId: source.sourceId, url: response.url || url, validator };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`CPLT_SOURCE_HEAD_FAILED: ${source.sourceId}: ${lastError?.message ?? "error desconocido"}`);
}

const temporary = mkdtempSync(join(tmpdir(), "cambiometro-cplt-freshness-"));
try {
  const manifestPath = join(temporary, "manifest.json");
  const result = wrangler(["r2", "object", "get", `${bucket}/${remoteManifestKey}`, "--file", manifestPath]);
  if (result.status !== 0 || !existsSync(manifestPath)) {
    const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (!/not found|no such key|does not exist|object.*missing/i.test(diagnostic)) {
      throw new Error(`CPLT_R2_MANIFEST_READ_FAILED: ${diagnostic.trim().slice(-500)}`);
    }
    writeOutput({ changed: "true", reason: "remote-manifest-missing" });
    console.log(JSON.stringify({ changed: true, reason: "remote-manifest-missing" }));
    process.exit(0);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const current = await Promise.all(CPLT_SOURCES.map(inspect));
  const comparisons = compareCpltSourceValidators(manifest.sources, current);
  const changed = comparisons.some((item) => item.changed);
  writeOutput({ changed: String(changed), reason: changed ? "source-changed" : "source-unchanged" });
  console.log(JSON.stringify({ changed, comparisons }, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
