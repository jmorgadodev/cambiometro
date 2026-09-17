import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { planR2Publication } from "./etl/r2.mjs";
import { assertRemoteR2WriteBudget, configuredR2BudgetBuckets } from "./etl/r2-account-budget.mjs";
import { listR2Objects } from "../lib/r2-live-list.mjs";
import { readJsonIfPresent, writeFileAtomic } from "./etl/safe-file.mjs";

function command(binary, args, allowFailure = false) {
  const result = spawnSync(binary, args, { encoding: "utf8", stdio: allowFailure ? "pipe" : "inherit" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${binary} fallo: ${result.error?.message ?? `codigo ${result.status}`}`);
  }
  return result;
}

function wrangler(args, allowFailure = false) {
  return command(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), ...args, "--remote"], allowFailure);
}

function wranglerWithRetry(args, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    attempt += 1;
    const res = wrangler(args, true);
    if (res.status === 0) return res;
    if (attempt === retries) {
      throw new Error(`wrangler ${args.join(" ")} fallo tras ${retries} intentos: ${res.stderr?.trim() ?? `codigo ${res.status}`}`);
    }
    spawnSync(process.execPath, ["-e", `setTimeout(()=>null, ${attempt * 3000})`]);
  }
}

function spawnCommand(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status: status ?? 1 }));
  });
}

async function wranglerWithRetryAsync(args, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    attempt += 1;
    const result = await spawnCommand(process.execPath, [resolve("node_modules/wrangler/bin/wrangler.js"), ...args, "--remote"]);
    if (result.status === 0) return;
    if (attempt === retries) {
      throw new Error(`wrangler ${args.join(" ")} fallo tras ${retries} intentos: codigo ${result.status}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 3000));
  }
}

async function runConcurrent(items, worker, concurrency) {
  let cursor = 0;
  const consume = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
}

function verifyAsset(outputRoot, metadata) {
  const filePath = join(outputRoot, metadata.key);
  if (!existsSync(filePath)) throw new Error(`PUBLICATION_MISSING_ASSET: ${metadata.key}`);
  const data = readFileSync(filePath);
  if (data.byteLength === 0) throw new Error(`PUBLICATION_EMPTY_ASSET: ${metadata.key}`);
  if (Number.isSafeInteger(metadata.size) && metadata.size !== data.byteLength) {
    throw new Error(`PUBLICATION_SIZE_MISMATCH: ${metadata.key}`);
  }
  const checksumSha256 = createHash("sha256").update(data).digest("hex");
  if (metadata.checksumSha256 !== checksumSha256) {
    throw new Error(`PUBLICATION_CHECKSUM_MISMATCH: ${metadata.key}`);
  }
  return { ...metadata, data };
}

const outputIndex = process.argv.indexOf("--output");
const outputRoot = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : "data/lake");
const bucketIndex = process.argv.indexOf("--bucket");
const bucket = bucketIndex >= 0 ? process.argv[bucketIndex + 1] : "transparencia-public-data";
const publishReleases = process.argv.includes("--releases");
const publishR2 = process.argv.includes("--r2");
const releaseManifestsOnly = process.argv.includes("--release-manifests-only");
const allowLocalAuth = process.argv.includes("--local-auth") && !process.env.CI;
const r2PublishConcurrency = Math.min(12, Math.max(1, Number.parseInt(process.env.R2_PUBLISH_CONCURRENCY ?? "8", 10)));
if (!publishReleases && !publishR2) throw new Error("Indica --releases, --r2 o ambos");

const planPath = join(outputRoot, "publish-plan.json");
if (!existsSync(planPath)) throw new Error(`No existe ${planPath}; ejecuta npm run data:lake`);
const publishPlan = JSON.parse(readFileSync(planPath, "utf8"));
const assets = publishPlan.assets
  .map((metadata) => verifyAsset(outputRoot, metadata))
  .sort((left, right) => {
    const leftActivatesVersion = left.key.endsWith("/manifest.json");
    const rightActivatesVersion = right.key.endsWith("/manifest.json");
    if (leftActivatesVersion !== rightActivatesVersion) return leftActivatesVersion ? 1 : -1;
    return left.key.localeCompare(right.key);
  });
const oversizedR2Asset = publishR2 && assets.find((asset) => asset.size > 300 * 1024 * 1024);
if (oversizedR2Asset) {
  throw new Error(`R2_OBJECT_EXCEEDS_WRANGLER_LIMIT: ${oversizedR2Asset.key} (${oversizedR2Asset.size} bytes)`);
}

if (publishReleases) {
  if (!process.env.GH_TOKEN?.trim()) throw new Error("PUBLICATION_MISSING_SECRET: GH_TOKEN");
  const releaseStaging = mkdtempSync(join(tmpdir(), "cambiometro-releases-"));
  const releaseVerifyRoot = mkdtempSync(join(tmpdir(), "cambiometro-release-verify-"));
  const releaseCatalog = releaseManifestsOnly ? assets.filter((asset) => asset.key.endsWith("/manifest.json")) : assets;
  if (releaseCatalog.length === 0) throw new Error("PUBLICATION_RELEASE_MANIFEST_MISSING");
  const grouped = Map.groupBy(releaseCatalog, (asset) => asset.releaseTag);
  for (const [tag, releaseAssets] of grouped) {
    const releaseView = command("gh", ["release", "view", tag, "--json", "assets"], true);
    let existingAssets = new Map();
    if (releaseView.status !== 0) {
      command("gh", ["release", "create", tag, "--title", tag, "--notes", "Archivo versionado de datos publicos oficiales y proyecciones trazables."]);
    } else {
      const parsed = JSON.parse(releaseView.stdout);
      existingAssets = new Map((parsed.assets ?? []).map((item) => [item.name, item]));
    }
    for (const asset of releaseAssets) {
      const existing = existingAssets.get(asset.releaseAssetName);
      if (existing) {
        if (existing.digest === `sha256:${asset.checksumSha256}`) continue;
        throw new Error(`IMMUTABLE_RELEASE_CONFLICT: ${tag}/${asset.releaseAssetName}`);
      }
      const stagedPath = join(releaseStaging, asset.releaseAssetName);
      copyFileSync(join(outputRoot, asset.key), stagedPath);
      const verifyRemote = () => {
        const verifyDir = mkdtempSync(join(releaseVerifyRoot, "asset-"));
        const downloaded = command("gh", ["release", "download", tag, "--pattern", asset.releaseAssetName, "--dir", verifyDir], true);
        const downloadedPath = join(verifyDir, asset.releaseAssetName);
        if (downloaded.status !== 0 || !existsSync(downloadedPath)) return false;
        const remoteChecksum = createHash("sha256").update(readFileSync(downloadedPath)).digest("hex");
        if (remoteChecksum !== asset.checksumSha256) throw new Error(`IMMUTABLE_RELEASE_CONFLICT: ${tag}/${asset.releaseAssetName}`);
        return true;
      };
      let attempts = 0;
      while (attempts < 3) {
        attempts += 1;
        const result = command("gh", ["release", "upload", tag, stagedPath], true);
        if (result.status === 0) {
          // Mantener el índice en memoria evita que dos assets generados con
          // el mismo nombre se vuelvan a subir dentro de esta ejecución.
          // GitHub Releases es inmutable por nombre: el segundo encuentro
          // debe tratarse como idempotente y conservar su checksum.
          existingAssets.set(asset.releaseAssetName, {
            name: asset.releaseAssetName,
            digest: `sha256:${asset.checksumSha256}`,
          });
          break;
        }
        // La subida puede haber llegado al servidor aunque la CLI reciba un
        // error de red. Antes de reintentar, consulta el release: si el asset
        // ya existe y conserva exactamente su digest, la operación es
        // idempotente y se puede continuar sin duplicar la carga.
        const alreadyExists = /already exists/i.test(result.stderr ?? "");
        if (alreadyExists) {
          // GitHub puede confirmar el conflicto antes de hacer visible el
          // asset en `release view`. Esperamos brevemente y consultamos varias
          // veces para distinguir esa consistencia eventual de un conflicto
          // real de contenido.
          let verifiedExisting = false;
          // El endpoint de upload puede reservar el nombre antes de que el
          // asset aparezca en los endpoints de lectura. Esperamos hasta dos
          // minutos antes de declarar la publicación fallida.
          for (let check = 1; check <= 12; check += 1) {
            const refreshed = command("gh", ["release", "view", tag, "--json", "assets"], true);
            if (refreshed.status === 0) {
              const remoteAssets = JSON.parse(refreshed.stdout).assets ?? [];
              const remote = remoteAssets.find((item) => item.name === asset.releaseAssetName);
              if (remote?.digest === `sha256:${asset.checksumSha256}`) {
                verifiedExisting = true;
                break;
              }
              if (remote) throw new Error(`IMMUTABLE_RELEASE_CONFLICT: ${tag}/${asset.releaseAssetName}`);
            }
            if (!verifiedExisting && verifyRemote()) {
              verifiedExisting = true;
              break;
            }
            if (check < 12) spawnSync(process.execPath, ["-e", "setTimeout(()=>null, 10000)"]);
          }
          if (verifiedExisting) break;
        }
        if (attempts === 3) throw new Error(`gh release upload fallo tras 3 intentos: codigo ${result.status} ${result.stderr?.trim() ? `(${result.stderr.trim()})` : ""}`);
        spawnSync(process.execPath, ["-e", "setTimeout(()=>null, 5000)"]);
      }
    }
  }
}

if (publishR2) {
  if (!allowLocalAuth) requireCloudflareDataCredentials();
  const r2Staging = mkdtempSync(join(tmpdir(), "cambiometro-r2-"));
  const inventoryPath = join(r2Staging, "storage.json");
  const inventoryKey = "catalog/v1/storage.json";
  const downloaded = wrangler(["r2", "object", "get", `${bucket}/${inventoryKey}`, "--file", inventoryPath], true);
  const cached = downloaded.status === 0 ? readJsonIfPresent(inventoryPath, { objects: [] }) : { objects: [] };
  const liveObjects = await listR2Objects({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    bucket,
  });
  const cachedByKey = new Map((cached.objects ?? []).map((object) => [object.key, object]));
  const previous = {
    schemaVersion: "1.0.0",
    limitBytes: cached.limitBytes,
    objects: liveObjects.map((object) => ({
      key: object.key,
      size: object.size,
      // El listado REST no expone SHA-256; reutilizamos el checksum del
      // inventario previo sólo cuando coincide el tamaño.
      checksumSha256: cachedByKey.get(object.key)?.size === object.size ? cachedByKey.get(object.key)?.checksumSha256 ?? null : null,
    })),
  };
  const previousCatalogPath = join(r2Staging, "catalog-before.json");
  const catalogDownload = wrangler(["r2", "object", "get", `${bucket}/catalog/v1/manifest.json`, "--file", previousCatalogPath], true);
  if (catalogDownload.status !== 0) throw new Error("PUBLICATION_BASELINE_CATALOG_UNAVAILABLE");
  const previousCatalog = readJsonIfPresent(previousCatalogPath, null);
  if (!Array.isArray(previousCatalog?.partitions)) throw new Error("PUBLICATION_BASELINE_CATALOG_INVALID");
  const r2Plan = planR2Publication(assets, previous, undefined, previousCatalog);
  const activationManifests = r2Plan.puts.filter((asset) => asset.key.endsWith("/manifest.json"));
  const inventoryText = `${JSON.stringify(r2Plan.inventory, null, 2)}\n`;
  const storageBudget = await assertRemoteR2WriteBudget({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    buckets: configuredR2BudgetBuckets(bucket),
    puts: [
      ...r2Plan.puts.map((asset) => ({ bucket, key: asset.key, size: asset.size })),
      { bucket, key: inventoryKey, size: Buffer.byteLength(inventoryText) },
    ],
    deletes: r2Plan.deletes.map((key) => ({ bucket, key, size: 0 })),
  });

  // Sólo se retiran versiones de proyecciones no activas ni protegidas para rollback.
  // El histórico de particiones nunca se elimina para liberar cuota automáticamente.
  await runConcurrent(r2Plan.deletes, (key) => wranglerWithRetryAsync(["r2", "object", "delete", `${bucket}/${key}`]), r2PublishConcurrency);
  const dataPuts = r2Plan.puts.filter((item) => !activationManifests.includes(item));
  await runConcurrent(dataPuts, (asset) => wranglerWithRetryAsync(["r2", "object", "put", `${bucket}/${asset.key}`, "--file", join(outputRoot, asset.key)]), r2PublishConcurrency);
  for (const manifest of activationManifests) {
    await wranglerWithRetryAsync(["r2", "object", "put", `${bucket}/${manifest.key}`, "--file", join(outputRoot, manifest.key), "--content-type", "application/json"]);
  }

  writeFileAtomic(inventoryPath, inventoryText, "utf8");
  await wranglerWithRetryAsync(["r2", "object", "put", `${bucket}/${inventoryKey}`, "--file", inventoryPath, "--content-type", "application/json"]);
  console.log(JSON.stringify({
    action: r2Plan.action,
    usedBytes: r2Plan.projectedBytes,
    limitBytes: r2Plan.limitBytes,
    puts: r2Plan.puts.length,
    deletes: r2Plan.deletes.length,
    storageBudget: {
      currentBytes: storageBudget.currentBytes,
      projectedBytes: storageBudget.projectedBytes,
      peakBytes: storageBudget.peakBytes,
    },
  }, null, 2));
}
