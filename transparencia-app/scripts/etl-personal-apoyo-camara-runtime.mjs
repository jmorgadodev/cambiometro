import { randomUUID, createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parsePersonalApoyoStaticPublicationResult, personalApoyoContentChecksum, personalApoyoDatasetForStaticRelease, shouldPublishPersonalApoyoCandidate, shouldReconcilePersonalApoyoStaticRelease, shouldRefreshPersonalApoyoPages, validatePersonalApoyoDataset } from "./etl/personal-apoyo-publication.mjs";
import { requireCloudflareDataCredentials } from "./etl/ci-env.mjs";
import { selectCamaraAdvisoriesCredentials } from "./etl/camara-local-auth.mjs";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(APP_ROOT, "..");
const RUNTIME_BASE = resolve(homedir(), ".cambiometro", "personal-apoyo-camara");
const BUCKET = "transparencia-public-data";
const TASK_LOG = join(RUNTIME_BASE, "personal-apoyo-camara.log");
const PENDING_PAGES = join(RUNTIME_BASE, "pending-pages-refresh.json");

function inside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  console.log(line.trimEnd());
  mkdirSync(RUNTIME_BASE, { recursive: true });
  appendFileSync(TASK_LOG, line, "utf8");
}

function run(command, args, { cwd = APP_ROOT, allowFailure = false, env = process.env } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.stdout) log(result.stdout.trimEnd());
  if (result.stderr) log(result.stderr.trimEnd());
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) throw new Error(`CAMARA_LOCAL_COMMAND_FAILED:${command}:${result.status}`);
  return result;
}

function git(root, ...args) {
  return run("git", ["-C", root, ...args], { cwd: root });
}

function wrangler(appRoot, ...args) {
  const bin = join(appRoot, "node_modules", "wrangler", "bin", "wrangler.js");
  return run(process.execPath, [bin, ...args], { cwd: appRoot });
}

function parseRepository(remote) {
  const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/i);
  if (!match) throw new Error("CAMARA_LOCAL_GITHUB_REMOTE_INVALID");
  return match[1];
}

function runIdFrom(output) {
  return output.match(/actions\/runs\/(\d+)/)?.[1] ?? null;
}

function gh(repo, ...args) {
  return run("gh", ["--repo", repo, ...args], { cwd: REPO_ROOT });
}

function pagesRunId(repo, sha, dispatchedAt) {
  const result = gh(repo, "run", "list", "--workflow", "pages-static-refresh.yml", "--limit", "10", "--json", "databaseId,event,headSha,createdAt");
  const runs = JSON.parse(result.stdout);
  const match = runs.find((item) => item.event === "workflow_dispatch" && item.headSha === sha && Date.parse(item.createdAt) >= dispatchedAt - 120_000);
  return match?.databaseId ? String(match.databaseId) : null;
}

function counts(dataset) {
  return validatePersonalApoyoDataset(dataset);
}

export function runIsolatedCamaraPersonalApoyo({
  sourceApp = APP_ROOT,
  runtimeBase = RUNTIME_BASE,
  ref = "origin/main",
  prepareOnly = false,
  allMonths = false,
  externalAdvisories = false,
} = {}) {
  const repoRoot = resolve(sourceApp, "..");
  const root = git(repoRoot, "rev-parse", "--show-toplevel").stdout.trim();
  const base = resolve(runtimeBase);
  if (inside(root, base) || inside(base, root)) throw new Error("CAMARA_LOCAL_RUNTIME_UNSAFE_ROOT");
  requireCloudflareDataCredentials();
  if (!existsSync(join(sourceApp, "node_modules", "wrangler", "bin", "wrangler.js"))) {
    throw new Error("CAMARA_LOCAL_RUNTIME_DEPENDENCIES_MISSING");
  }
  run("gh", ["auth", "status"], { cwd: repoRoot });

  const commit = git(repoRoot, "rev-parse", "--verify", `${ref}^{commit}`).stdout.trim();
  const remote = git(repoRoot, "remote", "get-url", "origin").stdout.trim();
  const repository = parseRepository(remote);
  mkdirSync(base, { recursive: true });
  const lockPath = join(base, "publication.lock");
  const lock = openSync(lockPath, "wx");
  const workspace = join(base, `run-${randomUUID()}`);
  const appRoot = join(workspace, "transparencia-app");
  const dependencyLink = join(appRoot, "node_modules");
  let created = false;
  let linked = false;
  try {
    git(repoRoot, "worktree", "add", "--detach", "--no-checkout", workspace, commit);
    created = true;
    git(workspace, "sparse-checkout", "set", "--no-cone",
      "/transparencia-app/scripts/", "/transparencia-app/lib/",
      "/transparencia-app/data/diputados-ids.json", "/transparencia-app/data/camara-diputados-historicos-ids.json",
      "/transparencia-app/package.json", "/transparencia-app/package-lock.json");
    git(workspace, "checkout", "--detach", commit);
    if (!readFileSync(join(appRoot, "package-lock.json")).equals(readFileSync(join(sourceApp, "package-lock.json")))) {
      throw new Error("CAMARA_LOCAL_RUNTIME_DEPENDENCIES_STALE");
    }
    symlinkSync(join(sourceApp, "node_modules"), dependencyLink, "junction");
    linked = true;
    if (prepareOnly) {
      log(JSON.stringify({ mode: "prepare-only", commit, repository }));
      return { status: "prepared", commit, repository };
    }

    const runDir = join(workspace, "etl-run");
    mkdirSync(runDir, { recursive: true });
    const currentManifest = join(runDir, "current-manifest.json");
    const currentRaw = join(runDir, "current.json");
    const current = join(runDir, "current-verified.json");
    const subset = join(runDir, "current-subset.json");
    const candidate = join(runDir, "candidate.json");

    wrangler(appRoot, "r2", "object", "get", `${BUCKET}/projections/personal-apoyo-v1/manifest.json`, "--file", currentManifest, "--remote");
    wrangler(appRoot, "r2", "object", "get", `${BUCKET}/projections/personal-apoyo-v1/personal-apoyo.json`, "--file", currentRaw, "--remote");
    run(process.execPath, [join(appRoot, "scripts", "verify-personal-apoyo-release.mjs"), "--manifest", currentManifest,
      "--input", currentRaw, "--output", current, "--subset", subset], { cwd: appRoot });
    if (externalAdvisories) {
      const importsPath = join(runDir, "advisories-imports.json");
      run(process.execPath, [join(appRoot, "scripts", "download-camara-external-advisories-2026.mjs"),
        `--dataset=${current}`, `--manifest=${importsPath}`], { cwd: appRoot });
      const imports = JSON.parse(readFileSync(importsPath, "utf8"));
      if (imports.length) {
        run(process.execPath, [join(appRoot, "scripts", "import-camara-external-advisories.mjs"),
          `--input=${current}`, `--manifest=${importsPath}`, `--output=${candidate}`, "--write"], { cwd: appRoot });
      } else {
        writeFileSync(candidate, readFileSync(current));
      }
    } else {
      run(process.execPath, [join(appRoot, "scripts", "etl-personal-apoyo.mjs"), "--source", "camara", "--input", current,
        "--output", candidate, ...(allMonths ? ["--all-months"] : [])], { cwd: appRoot });
    }

    const currentData = JSON.parse(readFileSync(current, "utf8"));
    const candidateData = JSON.parse(readFileSync(candidate, "utf8"));
    const summary = counts(candidateData);
    const contentChanged = shouldPublishPersonalApoyoCandidate(currentData, candidateData);
    if (externalAdvisories && !contentChanged && !existsSync(PENDING_PAGES)) {
      const result = { status: "unchanged", source: "camara-external-advisories", commit, ...summary };
      log(JSON.stringify(result));
      return result;
    }
    const checksum = createHash("sha256").update(readFileSync(candidate)).digest("hex");
    if (contentChanged) {
      if (externalAdvisories) {
        const latestManifest = join(runDir, "prepublication-manifest.json");
        wrangler(appRoot, "r2", "object", "get", `${BUCKET}/projections/personal-apoyo-v1/manifest.json`, "--file", latestManifest, "--remote");
        if (JSON.parse(readFileSync(latestManifest, "utf8")).checksumSha256 !== JSON.parse(readFileSync(currentManifest, "utf8")).checksumSha256) {
          throw new Error("CAMARA_ADVISORIES_RELEASE_CHANGED_RETRY_REQUIRED");
        }
      }
      run(process.execPath, [join(appRoot, "scripts", "publish-personal-apoyo.mjs"), "--input", candidate,
        "--bucket", BUCKET, "--remote", "--skip-d1"], { cwd: appRoot });
    }
    const pendingPages = existsSync(PENDING_PAGES);
    let staticChanged = false;
    let staticResult = null;
    if (shouldReconcilePersonalApoyoStaticRelease({ contentChanged, pending: pendingPages })) {
      const staticDataset = personalApoyoDatasetForStaticRelease(currentData, candidateData, contentChanged);
      const staticInput = join(appRoot, "data", "personal-apoyo.json");
      mkdirSync(dirname(staticInput), { recursive: true });
      writeFileSync(staticInput, `${JSON.stringify(staticDataset)}\n`, "utf8");
      const staticRelease = run(process.execPath, [join(appRoot, "scripts", "publish-static-site-inputs.mjs"), "--files", "data/personal-apoyo.json"], { cwd: appRoot });
      staticResult = parsePersonalApoyoStaticPublicationResult(staticRelease.stdout);
      staticChanged = staticResult.action === "published";
      if (contentChanged || staticChanged) {
        const pending = { createdAt: new Date().toISOString(), contentChecksum: personalApoyoContentChecksum(staticDataset), staticReleaseId: staticResult.releaseId };
        writeFileSync(PENDING_PAGES, `${JSON.stringify(pending)}\n`, "utf8");
      }
    }

    if (!shouldRefreshPersonalApoyoPages({ contentChanged, staticChanged, pending: pendingPages || existsSync(PENDING_PAGES) })) {
      log(JSON.stringify({ action: "unchanged", contentChecksum: personalApoyoContentChecksum(candidateData), ...summary }));
      return { status: "unchanged", commit, summary };
    }

    const dispatchedAt = Date.now();
    const dispatch = gh(repository, "workflow", "run", "pages-static-refresh.yml", "--ref", "main",
      "-f", "deployment_mode=data-refresh", "-f", "confirm_data_refresh=CAMBIOMETRO_DATA_REFRESH",
      "-f", "publish_pages=true", "-f", "confirm_cutover=CAMBIOMETRO_CONFIRM_CUTOVER");
    let runId = runIdFrom(dispatch.stdout + dispatch.stderr);
    if (!runId) runId = pagesRunId(repository, commit, dispatchedAt);
    if (!runId) throw new Error("CAMARA_LOCAL_PAGES_DISPATCH_ID_MISSING");
    gh(repository, "run", "watch", runId, "--exit-status", "--interval", "15");
    unlinkSync(PENDING_PAGES);

    const result = { action: contentChanged ? "published-and-deployed" : "pages-retry-deployed", commit, runId, checksumSha256: checksum, ...summary };
    log(JSON.stringify(result));
    return result;
  } finally {
    if (linked && existsSync(dependencyLink)) unlinkSync(dependencyLink);
    if (created && inside(base, workspace) && dirname(workspace) === base) {
      try {
        git(repoRoot, "worktree", "remove", "--force", workspace);
      } catch (cleanupError) {
        log(`CAMARA_LOCAL_WORKTREE_CLEANUP_WARNING:${cleanupError?.message ?? String(cleanupError)}`);
      }
    }
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--prepare-only", "--all-months", "--external-advisories"].includes(arg) && !arg.startsWith("--ref="))) throw new Error("CAMARA_LOCAL_RUNTIME_INVALID_ARGUMENT");
  const ref = args.find((arg) => arg.startsWith("--ref="))?.slice("--ref=".length) ?? "origin/main";
  try {
    if (args.includes("--external-advisories")) {
      const oauthEnv = { ...process.env };
      delete oauthEnv.CLOUDFLARE_API_TOKEN;
      delete oauthEnv.CLOUDFLARE_API_KEY;
      delete oauthEnv.CLOUDFLARE_EMAIL;
      // Capturar sólo en memoria: no pasar esta respuesta por run()/log().
      const session = process.env.CLOUDFLARE_DATA_API_TOKEN?.trim() ? null : spawnSync(process.execPath,
        [join(APP_ROOT, "node_modules", "wrangler", "bin", "wrangler.js"), "auth", "token", "--json"],
        { cwd: APP_ROOT, env: oauthEnv, encoding: "utf8", windowsHide: true });
      if (session && (session.error || session.status !== 0)) throw new Error("CAMARA_ADVISORIES_REAUTH_REQUIRED");
      const credentials = selectCamaraAdvisoriesCredentials(process.env, session ? JSON.parse(session.stdout) : null);
      process.env.CLOUDFLARE_API_TOKEN = credentials.token;
    }
    run("git", ["-C", REPO_ROOT, "fetch", "origin", "main"], { cwd: REPO_ROOT });
    runIsolatedCamaraPersonalApoyo({ ref, prepareOnly: args.includes("--prepare-only"), allMonths: args.includes("--all-months"), externalAdvisories: args.includes("--external-advisories") });
  } catch (error) {
    log(JSON.stringify({ action: "failed", message: error?.message ?? String(error) }));
    process.exitCode = 1;
  }
}
