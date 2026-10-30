import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assertCleanWorktree } from "./etl/local-worktree-guard.mjs";
import { selectCamaraAdvisoriesCredentials } from "./etl/camara-local-auth.mjs";

export function senateRuntimeEnvironment(environment, session) {
  try {
    const credentials = selectCamaraAdvisoriesCredentials(environment, session);
    return { ...environment, CLOUDFLARE_API_TOKEN: credentials.token };
  } catch (error) {
    throw new Error(error.message.endsWith("ACCOUNT_REQUIRED") ? "SENADO_RUNTIME_ACCOUNT_REQUIRED" : "SENADO_RUNTIME_REAUTH_REQUIRED");
  }
}

function inside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

/** Each invocation owns one disposable candidate; never restore or reset the frontend. */
export function runIsolatedSenateEtl({
  sourceApp = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  runtimeBase = join(process.env.LOCALAPPDATA ?? homedir(), "Cambiometro", "senado-votaciones"),
  ref = "origin/main",
  dryRun = false,
  prepareOnly = false,
  lookbackDays = 3,
  executeRunner = ({ appRoot, dryRun, lookbackDays }) => {
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      join(appRoot, "scripts", "etl-senado-votaciones-local.ps1"), "-LookbackDays", String(lookbackDays)];
    if (dryRun) args.push("-DryRun");
    const child = spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), args,
      { cwd: appRoot, stdio: "inherit", windowsHide: true });
    if (child.error) throw child.error;
    return child.status ?? 1;
  },
} = {}) {
  const git = (...args) => execFileSync("git", ["-C", sourceApp, ...args], { encoding: "utf8", windowsHide: true });
  const repository = git("rev-parse", "--show-toplevel").trim();
  const base = resolve(runtimeBase);
  if (inside(repository, base) || inside(base, repository)) throw new Error("SENADO_RUNTIME_UNSAFE_ROOT");
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > 14) throw new Error("SENADO_RUNTIME_INVALID_LOOKBACK");
  const dependencies = join(sourceApp, "node_modules");
  if (!existsSync(join(dependencies, "wrangler", "bin", "wrangler.js"))) throw new Error("SENADO_RUNTIME_DEPENDENCIES_MISSING");
  const commit = git("rev-parse", "--verify", `${ref}^{commit}`).trim();
  mkdirSync(base, { recursive: true });
  const workspace = join(base, `run-${randomUUID()}`);
  const appRoot = join(workspace, "transparencia-app");
  const dependencyLink = join(appRoot, "node_modules");
  let created = false;
  let linked = false;
  try {
    git("worktree", "add", "--detach", "--no-checkout", workspace, commit);
    created = true;
    // No national payroll, raw universe or lake projections are checked out.
    git("-C", workspace, "sparse-checkout", "set", "--no-cone",
      "/transparencia-app/scripts/", "/transparencia-app/lib/",
      "/transparencia-app/package.json", "/transparencia-app/package-lock.json",
      "/transparencia-app/tsconfig.json", "/transparencia-app/.gitignore",
      "/transparencia-app/data/", "!/transparencia-app/data/lake/",
      "!/transparencia-app/data/raw/", "!/transparencia-app/data/funcionarios/",
      "!/transparencia-app/data/lake-cplt/", "!/transparencia-app/data/cplt-category/",
      "!/transparencia-app/data/cplt-artifacts/");
    git("-C", workspace, "checkout", "--detach", commit);
    const lockPath = join(appRoot, "package-lock.json");
    if (existsSync(lockPath) && !readFileSync(lockPath).equals(readFileSync(join(sourceApp, "package-lock.json")))) {
      throw new Error("SENADO_RUNTIME_DEPENDENCIES_STALE");
    }
    if (!existsSync(join(appRoot, "scripts", "etl-senado-votaciones-local.ps1"))) throw new Error("SENADO_RUNTIME_RUNNER_MISSING");
    symlinkSync(dependencies, dependencyLink, "junction");
    linked = true;
    assertCleanWorktree(git("-C", appRoot, "status", "--porcelain=v1", "--untracked-files=all", "--", "data", "public/data"));
    console.log(JSON.stringify({ mode: prepareOnly ? "prepare-only" : dryRun ? "dry-run" : "etl", commit, appRoot, lookbackDays }));
    if (prepareOnly) return 0;
    return executeRunner({ appRoot, dryRun, lookbackDays });
  } finally {
    // Detach the junction first: cleanup must never traverse shared dependencies.
    if (linked) unlinkSync(dependencyLink);
    if (created && inside(base, workspace) && dirname(workspace) === base) {
      git("-c", "core.longpaths=true", "worktree", "remove", "--force", workspace);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--dry-run", "--prepare-only"].includes(arg))) throw new Error("SENADO_RUNTIME_INVALID_ARGUMENT");
  const options = { dryRun: args.includes("--dry-run"), prepareOnly: args.includes("--prepare-only") };
  const sourceApp = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!options.prepareOnly) {
    const oauthEnv = { ...process.env };
    delete oauthEnv.CLOUDFLARE_API_TOKEN;
    delete oauthEnv.CLOUDFLARE_API_KEY;
    delete oauthEnv.CLOUDFLARE_EMAIL;
    // Capturar únicamente en memoria, igual que el runner autorizado de Cámara.
    const session = process.env.CLOUDFLARE_DATA_API_TOKEN?.trim() ? null : spawnSync(process.execPath,
      [join(sourceApp, "node_modules", "wrangler", "bin", "wrangler.js"), "auth", "token", "--json"],
      { cwd: sourceApp, env: oauthEnv, encoding: "utf8", windowsHide: true });
    if (session && (session.error || session.status !== 0)) throw new Error("SENADO_RUNTIME_REAUTH_REQUIRED");
    let oauthSession = null;
    try { oauthSession = session ? JSON.parse(session.stdout) : null; }
    catch { throw new Error("SENADO_RUNTIME_REAUTH_REQUIRED"); }
    process.env.CLOUDFLARE_API_TOKEN = senateRuntimeEnvironment(process.env, oauthSession).CLOUDFLARE_API_TOKEN;
  }
  // Only fetch refs; never change the frontend checkout or choose its divergent HEAD.
  execFileSync("git", ["-C", sourceApp, "fetch", "origin", "main"], { stdio: "inherit", windowsHide: true });
  process.exitCode = runIsolatedSenateEtl(options);
}
