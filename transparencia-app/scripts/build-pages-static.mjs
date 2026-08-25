#!/usr/bin/env node

/**
 * Construye la variante Cloudflare Pages sin modificar el checkout de OpenNext.
 *
 * Durante la migración conviven dos artefactos:
 * - OpenNext, que conserva las APIs Next y sirve como rollback conocido-bueno.
 * - Pages, que se construye en un staging sin app/api ni middleware.
 *
 * El staging es temporal y está ignorado por Git. Cuando el Worker público
 * alcance paridad contractual, el staging dejará de ser necesario y el app/api
 * histórico podrá retirarse en un cambio separado.
 */

import { access, cp, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { prunePagesOutput } from "./prune-pages-output.mjs";

const appRoot = process.cwd();
const stageRoot = path.join(appRoot, ".pages-static");
const outputRoot = path.join(appRoot, "out");

const SKIP_DIRS = new Set([
  ".next",
  ".open-next",
  ".wrangler",
  ".pages-static",
  "node_modules",
  "out",
  "coverage",
  "scripts",
  "fixtures",
  "migrations",
  "workers",
  "auditoria_integridad_datos",
]);

function relativePath(source) {
  return path.relative(appRoot, source).replaceAll("\\", "/");
}

function shouldCopy(source) {
  const relative = relativePath(source);
  if (!relative) return true;
  const first = relative.split("/")[0];
  if (SKIP_DIRS.has(first)) return false;
  if (relative === "middleware.ts" || relative === "middleware.js") return false;
  if (relative === ".pages-static-middleware.ts") return false;
  if (relative === "next.config.ts" || relative === "next.config.js") return false;
  if (relative.startsWith("app/api/")) return false;
  // Estos artefactos son fuentes ETL, no dependencias del HTML estático.
  if (relative.startsWith("data/lake/.work/")) return false;
  if (relative.startsWith("data/lake/originals/")) return false;
  if (relative.startsWith("data/lake/partitions/")) return false;
  if (relative.startsWith("data/lake/indexes/")) return false;
  return true;
}

const staticConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  // El staging se construye dentro de appRoot y reutiliza sus dependencias.
  // El middleware original se aparca con restauración garantizada mientras
  // corre Next, para que Turbopack no lo descubra en el build Pages.
  turbopack: { root: ${JSON.stringify(appRoot)} },
  experimental: { cpus: 2 },
  allowedDevOrigins: ["127.0.0.1"],
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
`;

const staticPackage = JSON.stringify({
  name: "cambiometro-pages-build",
  private: true,
  scripts: { build: "next build" },
  dependencies: { next: "16.3.0", react: "19.2.8", "react-dom": "19.2.8" },
}, null, 2) + "\n";

const staticTsconfig = JSON.stringify({
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "react-jsx",
    incremental: true,
    plugins: [{ name: "next" }],
    paths: { "@/*": ["./*"] },
  },
  include: [
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "lib/**/*.tsx",
    "scripts/etl/senado-assignment.d.mts",
    ".next/types/**/*.ts",
  ],
  exclude: ["node_modules", "**/*.test.ts", "**/*.test.tsx", "scripts", "workers"],
}, null, 2) + "\n";

const staticRedirects = `/municipalidades/muni-maipu /municipalidades/maipu 301\n/politico/sen-038 /politico/vanessa-kaiser-barents-von-hohenhagen 301\n`;

const staticHeaders = `/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-cambiometro-static-v1' https://challenges.cloudflare.com; style-src 'self' 'nonce-cambiometro-static-v1'; style-src-attr 'unsafe-hashes' 'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk=' 'sha256-Ljkfty1t/woMLT2x9Iz6T/lBNwFLz47mVMsI0TvizTY='; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cambiometro.impulsacv.cl https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-DNS-Prefetch-Control: on
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/widget.js
  Cross-Origin-Resource-Policy: cross-origin
  Access-Control-Allow-Origin: *

/widget.css
  Cross-Origin-Resource-Policy: cross-origin
  Access-Control-Allow-Origin: *
`;

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: stageRoot, stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} terminó con ${code ?? signal}`));
    });
  });
}

async function runFromCheckout(script, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(appRoot, "scripts", script), ...args], { cwd: appRoot, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} terminó con ${code ?? signal}`));
    });
  });
}

async function writeTransferReleaseOverride() {
  const summaryPath = path.join(appRoot, "public", "data", "transferencias", "summary.json");
  try {
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    const subsetPath = path.join(stageRoot, "data", "lake-subsets", "ley19862.subset.json");
    await mkdir(path.dirname(subsetPath), { recursive: true });
    const subset = {
      generatedAt: summary.generatedAt,
      source: "pages-build:ley19862-full",
      kpis: summary.kpis,
      by_year: summary.by_year,
      top_receptores: (summary.top_receptores ?? []).slice(0, 20),
      top_emisores: (summary.top_emisores ?? []).slice(0, 20),
      transfers_sample: (summary.transfers_sample ?? []).slice(0, 50),
    };
    await writeFile(subsetPath, `${JSON.stringify(subset)}\n`, "utf8");
  } catch (error) {
    throw new Error(`PAGES_TRANSFER_RELEASE_OVERRIDE_FAILED: ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  await rm(stageRoot, { recursive: true, force: true });
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(stageRoot, { recursive: true });

  // fs.cp rechaza copiar un directorio dentro de sí mismo. Copiamos sus
  // entradas una por una y mantenemos el filtro en el mismo punto.
  for (const entry of await readdir(appRoot)) {
    const source = path.join(appRoot, entry);
    if (!shouldCopy(source)) continue;
    await cp(source, path.join(stageRoot, entry), {
      recursive: true,
      filter: shouldCopy,
    });
  }

  // Esta función pura se usa para calcular la evaluación visible del Senado;
  // el resto del pipeline queda fuera del artefacto Pages.
  const senateAssignmentSource = path.join(appRoot, "scripts", "etl", "senado-assignment.mjs");
  const senateAssignmentTypesSource = path.join(appRoot, "scripts", "etl", "senado-assignment.d.mts");
  const senateAssignmentTarget = path.join(stageRoot, "scripts", "etl", "senado-assignment.mjs");
  const senateAssignmentTypesTarget = path.join(stageRoot, "scripts", "etl", "senado-assignment.d.mts");
  await mkdir(path.dirname(senateAssignmentTarget), { recursive: true });
  await cp(senateAssignmentSource, senateAssignmentTarget);
  await cp(senateAssignmentTypesSource, senateAssignmentTypesTarget);

  // No copiamos node_modules: el staging vive dentro de appRoot y Node lo
  // resuelve desde el checkout. El middleware se aparca con restauración
  // idempotente y manejadores de señal para que cancelar el build no mutile
  // el checkout.

  await writeFile(path.join(stageRoot, "next.config.ts"), staticConfig, "utf8");
  await writeFile(path.join(stageRoot, "package.json"), staticPackage, "utf8");
  await writeFile(path.join(stageRoot, "tsconfig.json"), staticTsconfig, "utf8");
  await writeTransferReleaseOverride();
  await runFromCheckout("prepare-static-csp.mjs", [`--root=${stageRoot}`]);

  const nextBin = process.platform === "win32"
    ? path.join(appRoot, "node_modules", ".bin", "next.cmd")
    : path.join(appRoot, "node_modules", ".bin", "next");
  const middlewareSource = path.join(appRoot, "middleware.ts");
  const middlewareParked = path.join(appRoot, ".pages-static-middleware.ts");
  let middlewareWasParked = false;
  let onSigint;
  let onSigterm;
  const restoreMiddleware = async () => {
    if (!middlewareWasParked) return;
    await rename(middlewareParked, middlewareSource);
    middlewareWasParked = false;
  };
  const restoreOnSignal = (signal) => {
    void restoreMiddleware().finally(() => {
      process.exitCode = 128 + (signal === "SIGINT" ? 2 : 15);
    });
  };

  // Recuperación defensiva si un proceso anterior terminó después de aparcar.
  try {
    await access(middlewareParked);
    await access(middlewareSource).catch(async () => rename(middlewareParked, middlewareSource));
  } catch {
    // No hay archivo aparcado pendiente.
  }
  try {
    await access(middlewareSource);
    await rename(middlewareSource, middlewareParked);
    middlewareWasParked = true;
    onSigint = () => restoreOnSignal("SIGINT");
    onSigterm = () => restoreOnSignal("SIGTERM");
    process.once("SIGINT", onSigint);
    process.once("SIGTERM", onSigterm);

    await run(nextBin, ["build"]);
    const middlewareManifestPath = path.join(stageRoot, ".next", "server", "middleware-manifest.json");
    const middlewareManifest = JSON.parse(await readFile(middlewareManifestPath, "utf8"));
    if (Object.keys(middlewareManifest.middleware ?? {}).length > 0 || Object.keys(middlewareManifest.functions ?? {}).length > 0) {
      throw new Error("PAGES_STATIC_MIDDLEWARE_DETECTED: el staging no puede contener middleware ni funciones dinámicas");
    }
    await cp(path.join(stageRoot, "out"), outputRoot, { recursive: true });
    const prunedRouteDataFiles = await prunePagesOutput(outputRoot);
    await runFromCheckout("finalize-static-csp.mjs", [`--root=${outputRoot}`]);
    await writeFile(path.join(outputRoot, "_redirects"), staticRedirects, "utf8");
    await writeFile(path.join(outputRoot, "_headers"), staticHeaders, "utf8");
    console.log(`[pages] salida estática: ${outputRoot}; archivos RSC auxiliares eliminados: ${prunedRouteDataFiles}`);
  } finally {
    await restoreMiddleware();
    if (onSigint) process.removeListener("SIGINT", onSigint);
    if (onSigterm) process.removeListener("SIGTERM", onSigterm);
  }
}

main().catch((error) => {
  console.error("[pages] build falló:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
