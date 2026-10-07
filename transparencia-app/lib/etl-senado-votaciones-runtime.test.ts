import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { runIsolatedSenateEtl } from "../scripts/etl-senado-votaciones-runtime.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "senado-runtime-test-"));
  const repository = join(root, "repo");
  const sourceApp = join(repository, "transparencia-app");
  mkdirSync(join(sourceApp, "scripts", "etl"), { recursive: true });
  mkdirSync(join(sourceApp, "data"), { recursive: true });
  mkdirSync(join(sourceApp, "node_modules", "wrangler", "bin"), { recursive: true });
  writeFileSync(join(sourceApp, "scripts", "etl-senado-votaciones-local.ps1"), "# fixture\n");
  writeFileSync(join(sourceApp, "data", "politicos-votaciones.json"), "[]\n");
  writeFileSync(join(sourceApp, "node_modules", "wrangler", "bin", "wrangler.js"), "// dependency\n");
  writeFileSync(join(sourceApp, ".gitignore"), "node_modules/\n");
  const git = (...args: string[]) => execFileSync("git", ["-C", repository, ...args], { encoding: "utf8", windowsHide: true });
  git("init", "--quiet");
  git("config", "core.autocrlf", "false");
  git("add", ".");
  git("-c", "user.name=Runtime Test", "-c", "user.email=runtime@example.invalid", "commit", "--quiet", "-m", "fixture");
  return { root, sourceApp, git, runtimeBase: join(root, "runtime") };
}

describe("ejecutor aislado de votaciones Senado", () => {
  it("crea un espacio limpio por ejecución y no altera datos o dependencias del frontend", () => {
    const f = fixture();
    const workspaces: string[] = [];
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        expect(runIsolatedSenateEtl({ ...f, ref: "HEAD", executeRunner: ({ appRoot, dryRun }) => {
          workspaces.push(appRoot);
          expect(dryRun).toBe(true);
          expect(readFileSync(join(appRoot, "data", "politicos-votaciones.json"), "utf8")).toBe("[]\n");
          expect(existsSync(join(appRoot, "node_modules", "wrangler", "bin", "wrangler.js"))).toBe(true);
          writeFileSync(join(appRoot, "data", "politicos-votaciones.json"), "[\"generated candidate\"]\n");
          return 0;
        }, dryRun: true })).toBe(0);
      }
      expect(workspaces[0]).not.toBe(workspaces[1]);
      expect(workspaces.every((path) => !existsSync(path))).toBe(true);
      expect(readFileSync(join(f.sourceApp, "data", "politicos-votaciones.json"), "utf8")).toBe("[]\n");
      expect(existsSync(join(f.sourceApp, "node_modules", "wrangler", "bin", "wrangler.js"))).toBe(true);
      expect(f.git("status", "--porcelain")).toBe("");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it("conserva el código de fallo del conector y limpia únicamente su candidato", () => {
    const f = fixture();
    let appRoot = "";
    try {
      expect(runIsolatedSenateEtl({ ...f, ref: "HEAD", executeRunner: (context) => {
        appRoot = context.appRoot;
        return 7;
      } })).toBe(7);
      expect(existsSync(appRoot)).toBe(false);
      expect(existsSync(f.sourceApp)).toBe(true);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it("rechaza crear candidatos dentro del repositorio de presentación", () => {
    const f = fixture();
    try {
      expect(() => runIsolatedSenateEtl({ ...f, ref: "HEAD", runtimeBase: join(f.sourceApp, "runtime") }))
        .toThrow("SENADO_RUNTIME_UNSAFE_ROOT");
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it("el preflight no ejecuta extracción ni publicación", () => {
    const f = fixture();
    try {
      expect(runIsolatedSenateEtl({ ...f, ref: "HEAD", prepareOnly: true, executeRunner: () => {
        throw new Error("no debe ejecutarse");
      } })).toBe(0);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it("rechaza ventanas extensas antes de preparar el candidato", () => {
    const f = fixture();
    try {
      expect(() => runIsolatedSenateEtl({ ...f, ref: "HEAD", lookbackDays: 15 }))
        .toThrow("SENADO_RUNTIME_INVALID_LOOKBACK");
      expect(existsSync(f.runtimeBase)).toBe(false);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });

  it("limpia también si el proceso local no puede arrancar", () => {
    const f = fixture();
    let appRoot = "";
    try {
      expect(() => runIsolatedSenateEtl({ ...f, ref: "HEAD", executeRunner: (context) => {
        appRoot = context.appRoot;
        throw new Error("runner unavailable");
      } })).toThrow("runner unavailable");
      expect(existsSync(appRoot)).toBe(false);
      expect(existsSync(join(f.sourceApp, "node_modules", "wrangler", "bin", "wrangler.js"))).toBe(true);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  });
});
