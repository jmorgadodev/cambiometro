import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Protección de Costo GitHub Actions + Calendario ETL Oficial", () => {
  const root = process.cwd();
  const workflowsDir = path.resolve(root, "..", ".github", "workflows");
  const inventarioCsvPath = path.resolve(root, "auditoria_integridad_datos", "inventario_completo_etls.csv");
  const arquitecturaMarkdownPath = path.resolve(root, "docs", "arquitectura-datos.md");

  const workflowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  it("1. TODOS los workflows tienen concurrency con cancel-in-progress: true", () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(10);

    for (const file of workflowFiles) {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
      expect(content, `El workflow ${file} debe tener bloque concurrency`).toContain("concurrency:");
      expect(content, `El workflow ${file} debe tener cancel-in-progress: true`).toMatch(/cancel-in-progress:\s*true/);
    }
  });

  it("2. Workflows disparados por push / pull_request validan también la documentación", () => {
    const triggerWorkflows = ["quality.yml", "build-e2e.yml", "codeql.yml", "security.yml"];

    for (const file of triggerWorkflows) {
      const filePath = path.join(workflowsDir, file);
      expect(fs.existsSync(filePath), `Debe existir ${file}`).toBe(true);

      const content = fs.readFileSync(filePath, "utf8");
      expect(content, `${file} debe contener paths-ignore`).toContain("paths-ignore:");
      expect(content, `${file} no debe ignorar archivos .md`).not.toContain("**/*.md");
      expect(content, `${file} no debe ignorar docs/`).not.toContain("docs/**");
      expect(content, `${file} debe ignorar auditoria_integridad_datos/`).toContain("auditoria_integridad_datos/**");
    }
  });

  it("3. Los ETL no despliegan Pages ni el Worker público; el bridge interno es la única excepción", () => {
    for (const file of workflowFiles) {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
      const hasSchedule = content.includes("schedule:") || content.includes("cron:");

      if (hasSchedule) {
        const isLeySourceBridge = file === "etl-ley-19862.yml"
          && content.includes("workers/ley19862-source-bridge/wrangler.jsonc")
          && content.includes("--name cambiometro-ley19862-source");
        const deployCommands = content.match(/wrangler(?:\s+pages)?\s+deploy/gi) ?? [];
        if (isLeySourceBridge) expect(deployCommands).toHaveLength(1);
        else expect(content, `El workflow programado ${file} NO debe contener comandos de deploy`).not.toMatch(/wrangler(?:\s+pages)?\s+deploy/i);
        expect(content, `El workflow programado ${file} NO debe invocar npm run deploy`).not.toMatch(/npm\s+run\s+deploy/i);
      }
    }
  });

  it("4. Calendario ETL: los 11 procesos automáticos y SERVEL tienen su contrato exacto", () => {
    const cronMap: Record<string, string | null> = {
      "etl-daily.yml": "0 7 * * *",
      "etl-chilecompra.yml": "0 8 * * 1",
      "etl-infolobby.yml": "30 8 * * 1",
      "etl-contraloria.yml": "0 9 2 * *",
      "etl-cplt.yml": "0 9 5 * *",
      "etl-ley-19862.yml": "0 9 8 * *",
      "etl-infoprobidad.yml": "0 9 10 * *",
      "etl-dipres.yml": "0 9 1 1,4,7,10 *",
      "etl-sinim.yml": "0 9 1 3,9 *",
      "etl-expenses.yml": "30 8 2 * *",
      "etl-servel.yml": null, // workflow_dispatch (on-demand)
    };

    for (const [file, expectedCron] of Object.entries(cronMap)) {
      const filePath = path.join(workflowsDir, file);
      expect(fs.existsSync(filePath), `Debe existir el workflow ${file}`).toBe(true);
      const content = fs.readFileSync(filePath, "utf8");

      if (expectedCron) {
        expect(content, `${file} debe tener el cron '${expectedCron}'`).toContain(`cron: "${expectedCron}"`);
      } else {
        expect(content, `${file} debe ser on-demand via workflow_dispatch`).toContain("workflow_dispatch:");
        expect(content, `${file} NO debe tener schedule programado`).not.toContain("schedule:");
      }
    }
  });

  it("5. inventario_completo_etls.csv refleja las frecuencias y crons del calendario oficial", () => {
    expect(fs.existsSync(inventarioCsvPath)).toBe(true);
    const csv = fs.readFileSync(inventarioCsvPath, "utf8");

    // Validar frecuencias en CSV
    expect(csv).toContain("Diario 03:00 CLT (0 7 * * *)");
    expect(csv).toContain("Semanal Lunes 04:00 CLT (0 8 * * 1)");
    expect(csv).toContain("Semanal Lunes 04:30 CLT (30 8 * * 1)");
    expect(csv).toContain("Mensual Día 2 05:00 CLT (0 9 2 * *)");
    expect(csv).toContain("Mensual Día 5 05:00 CLT (0 9 5 * *)");
    expect(csv).toContain("Mensual Día 8 05:00 CLT (0 9 8 * *)");
    expect(csv).toContain("Mensual Día 10 05:00 CLT (0 9 10 * *)");
    expect(csv).toContain("Trimestral Día 1 Ene/Abr/Jul/Oct 05:00 CLT (0 9 1 1,4,7,10 *)");
    expect(csv).toContain("Semestral Día 1 Mar/Sep 05:00 CLT (0 9 1 3,9 *)");
    expect(csv).toContain("Bajo Demanda / Por Elección (workflow_dispatch)");
  });

  it("6. docs/arquitectura-datos.md documenta fuentes, integridad y append-only (sin reglas de costo internas)", () => {
    expect(fs.existsSync(arquitecturaMarkdownPath)).toBe(true);
    const md = fs.readFileSync(arquitecturaMarkdownPath, "utf8");

    // Secciones técnicas del documento
    expect(md).toContain("## 1. Arquitectura de Ingesta y Flujo de Datos");
    expect(md).toContain("## 2. Catálogo Detallado de Pipelines ETL");
    expect(md).toContain("## 3. Integridad de Datos");
    expect(md).toContain("## 4. Append-only y Versionado");

    // El documento no contiene reglas de costo ni calendarios internos
    expect(md).not.toContain("§11");
    expect(md).not.toContain("Spending limits");
    expect(md).not.toContain("Plan de Launch");
    expect(md).not.toContain("brief");
  });

  it("7. vigilancia D1 horaria usa Analytics y runner estándar; billing sólo manual", () => {
    const watchPath = path.join(workflowsDir, "usage-watch.yml");
    expect(fs.existsSync(watchPath)).toBe(true);
    const content = fs.readFileSync(watchPath, "utf8");

    expect(content).toContain("workflow_dispatch:");
    expect(content).toContain('cron: "15 * * * *"');
    expect(content).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(content).toContain("runs-on: ubuntu-latest");
    expect(content).toContain("node scripts/check-d1-usage.mjs");
    expect(content).not.toMatch(/d1\s+execute|data:materialize|npm\s+run\s+etl/);
    expect(content).toContain("api.github.com/users/$OWNER/settings/billing/actions");
  });

  it("8. Ley 19.862 mantiene R2 canónico cuando D1 alcanza su límite", () => {
    const content = fs.readFileSync(path.join(workflowsDir, "etl-ley-19862.yml"), "utf8");

    expect(content).toContain("D1 opcional");
    expect(content).toContain("Exceeded maximum DB size");
    expect(content).toContain("code: 7500");
    expect(content).toContain("R2 permanece como fuente canónica");
    expect(content).toContain("se aborta el ETL");
    expect(content).toContain("status=skipped_r2_canonical");
    expect(content).toContain("transfer-d1-materialization-${{ github.run_id }}");
  });

  it("9. Las votaciones usan incremental diario y reservan el full para backfill", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "etl-daily.yml"), "utf8");
    const ingest = fs.readFileSync(path.resolve(root, "scripts", "ingest-votaciones-full.mjs"), "utf8");

    expect(workflow).toContain("full_votaciones:");
    expect(workflow).toContain("FULL_VOTACIONES");
    expect(workflow).toContain("npm run ingest:votaciones-full -- --full");
    expect(ingest).toContain("const REFRESH_FROM");
    expect(ingest).toContain("function cachedSession");
    expect(ingest).toContain("if (cached && !shouldRefresh(vote.fecha)) return cached");
  });

  it("10. El ETL diario omite D1 cuando la cuota ya está elevada", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "etl-daily.yml"), "utf8");

    expect(workflow).toContain("id: d1-quota");
    expect(workflow).toContain("D1_USAGE_OUTPUT: d1-preflight.json");
    expect(workflow).toContain("proceed=false");
    expect(workflow).toContain("steps.d1-quota.outputs.proceed == 'true'");
    expect(workflow).toContain("D1_THRESHOLD_PERCENT: 60");
    expect(workflow).toContain("Math.max(report.readPercent ?? 100, report.writePercent ?? 100)");
  });

  it("11. Todo ETL que materializa D1 tiene el preflight fail-safe de cuota", () => {
    const workflows = [
      "etl-chilecompra.yml",
      "etl-contraloria.yml",
      "etl-dipres.yml",
      "etl-expenses.yml",
      "etl-infolobby.yml",
      "etl-infoprobidad.yml",
      "etl-ley-19862.yml",
      "etl-servel.yml",
      "etl-sinim.yml",
      "etl-personal-apoyo.yml",
      "etl-cplt.yml",
    ];

    for (const name of workflows) {
      const content = fs.readFileSync(path.join(workflowsDir, name), "utf8");
      expect(content, name).toContain("uses: ./.github/actions/d1-preflight");
      expect(content, name).toContain('threshold-percent: "60"');
      expect(content, name).toContain("steps.d1-quota.outputs.proceed == 'true'");
    }
  });

  it("12. Los ETL de personal y CPLT preservan R2 cuando D1 se pospone", () => {
    const personal = fs.readFileSync(path.join(workflowsDir, "etl-personal-apoyo.yml"), "utf8");
    const cplt = fs.readFileSync(path.join(workflowsDir, "etl-cplt.yml"), "utf8");
    expect(personal).toContain("--skip-d1");
    expect(personal).toContain("Publicar personal de apoyo sólo en R2 por cuota");
    expect(cplt).toContain("data:finalize:cplt:r2");
    expect(cplt).toContain("Registrar D1 CPLT pospuesto por cuota");
  });
});
