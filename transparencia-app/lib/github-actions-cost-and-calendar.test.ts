import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Protección de Costo GitHub Actions + Calendario ETL Oficial", () => {
  const root = process.cwd();
  const workflowsDir = path.resolve(root, "..", ".github", "workflows");
  const inventarioCsvPath = path.resolve(root, "auditoria_integridad_datos", "inventario_completo_etls.csv");
  const arquitecturaMarkdownPath = path.resolve(root, "docs", "arquitectura-datos.md");

  const workflowFiles = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  it("1. TODOS los workflows tienen concurrency y serializan las publicaciones estáticas", () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(10);

    const staticPublishers = new Set([
      "etl-chilecompra.yml", "etl-contraloria.yml", "etl-cplt.yml", "etl-daily.yml", "etl-camara-votaciones.yml", "etl-senado-votaciones.yml",
      "etl-dipres.yml", "etl-expenses.yml", "etl-infolobby-scheduled.yml", "etl-infoprobidad.yml",
      "etl-ley-19862.yml", "etl-movimientos.yml", "etl-personal-apoyo.yml", "etl-personal-apoyo-senado.yml", "etl-servel.yml",
      "etl-sinim.yml", "etl-camara-reconciliation.yml", "etl-remuneraciones-38bis.yml",
      "pages-ui-refresh.yml", "pages-static-refresh.yml", "pages-promote-artifact.yml",
    ]);
    const serializedMutations = new Set(["repair-transfer-d1.yml"]);

    for (const file of workflowFiles) {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
      expect(content, `El workflow ${file} debe tener bloque concurrency`).toContain("concurrency:");
      if (staticPublishers.has(file)) {
        expect(content, `El workflow ${file} debe compartir la cola de publicación estática`).toMatch(/group:\s*cambiometro-static-publication/);
        expect(content, `El workflow ${file} no debe cancelar otra publicación estática`).toMatch(/cancel-in-progress:\s*false/);
        if (file !== "etl-senado-votaciones.yml") {
          expect(content, `El workflow ${file} debe conservar las publicaciones pendientes`).toMatch(/queue:\s*max/);
        }
        if (file === "pages-static-refresh.yml") expect(content).toContain("needs: refresh-decision");
      } else if (serializedMutations.has(file)) {
        expect(content, `El workflow ${file} debe usar una cola propia`).toMatch(/group:\s*cambiometro-transfer-d1-repair/);
        expect(content, `El workflow ${file} no debe cancelar una reparación D1 activa`).toMatch(/cancel-in-progress:\s*false/);
      } else {
        expect(content, `El workflow ${file} debe conservar cancel-in-progress: true`).toMatch(/cancel-in-progress:\s*true/);
      }
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

  it("4. Calendario ETL: los procesos automáticos tienen su contrato exacto", () => {
    const cronMap: Record<string, string | null> = {
      "etl-daily.yml": "0 7 * * *",
      "etl-camara-votaciones.yml": "15 7 * * *",
      "etl-personal-apoyo.yml": null, // extraction local-only: la fuente bloquea GitHub-hosted
      "etl-personal-apoyo-senado.yml": "30 7 * * *",
      "etl-chilecompra.yml": "0 8 * * 1",
      "etl-infolobby-scheduled.yml": "30 8 * * 1",
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
    expect(content).toContain("D1_USAGE_FAIL_ON_CRITICAL");
    expect(content).not.toMatch(/d1\s+execute|data:materialize|npm\s+run\s+etl/);
    expect(content).toContain("api.github.com/users/$OWNER/settings/billing/actions");
  });

  it("8. Ley 19.862 publica en R2 sin crear ni materializar D1", () => {
    const content = fs.readFileSync(path.join(workflowsDir, "etl-ley-19862.yml"), "utf8");

    expect(content).not.toMatch(/d1-preflight|ensure-transfer-d1|data:materialize|transfer-d1-materialization|wrangler d1/i);
    expect(content).toContain("npm run data:publish:static -- --groups ley19862");
    expect(content).toContain("npm run data:publish:transfer-api");
    expect(content).toContain("contents: read");
  });

  it("9. Senado se ejecuta sólo desde la tarea local y conserva la reparación manual aislada", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "etl-daily.yml"), "utf8");
    const ingest = fs.readFileSync(path.resolve(root, "scripts", "ingest-votaciones-full.mjs"), "utf8");

    expect(workflow).toContain("name: ETL Diario - Cámara");
    expect(workflow).toContain("--source camara");
    expect(workflow).not.toContain("full_votaciones:");
    const camaraVotesWorkflow = fs.readFileSync(path.join(workflowsDir, "etl-camara-votaciones.yml"), "utf8");
    expect(camaraVotesWorkflow).toContain("name: ETL Diario - Votaciones Cámara");
    expect(camaraVotesWorkflow).toContain("--source votaciones_camara");
    expect(camaraVotesWorkflow).toContain("npm run ingest:votaciones-full -- --source camara --full");
    const senateRemoteWorkflow = path.join(workflowsDir, "etl-senado-votaciones.yml");
    const senateLocalTask = path.resolve(root, "scripts", "etl-senado-votaciones-local.ps1");
    const senateRepairWorkflow = path.join(workflowsDir, "repair-senado-votaciones-staged.yml");
    expect(fs.existsSync(senateRemoteWorkflow), "No debe quedar ETL remoto programado para Senado").toBe(false);
    expect(fs.existsSync(senateLocalTask), "Debe conservarse la tarea local de Senado").toBe(true);
    expect(fs.existsSync(senateRepairWorkflow), "La reparación manual aislada sigue disponible").toBe(true);
    const localTask = fs.readFileSync(senateLocalTask, "utf8");
    expect(localTask).toContain("data:lake");
    expect(localTask).toContain("data:publish");
    const etlPipeline = fs.readFileSync(path.resolve(root, "scripts", "etl.mjs"), "utf8");
    expect(etlPipeline).toContain("fetchSenateVotesByDateRange({");
    expect(etlPipeline).toContain("existingVoteIds: [...publishedSenateVoteIds]");
    expect(workflow).not.toContain("--source camara,votaciones_camara");
    expect(ingest).toContain("const REFRESH_FROM");
    expect(ingest).toContain("function cachedSession");
    expect(ingest).toContain("if (cached && !shouldRefresh(vote.fecha)) return cached");
  });

  it("el ETL de votaciones de Cámara no vuelve a publicar personal de apoyo desde un snapshot viejo", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "etl-camara-votaciones.yml"), "utf8");

    expect(workflow).toContain("npm run data:publish:static -- --files data/politicos-votaciones.json,data/lake-subsets/politicos-votaciones.subset.json");
    expect(workflow).not.toContain("--groups parlamento");
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
      "etl-infolobby-scheduled.yml",
      "etl-servel.yml",
    ];

    for (const name of workflows) {
      const content = fs.readFileSync(path.join(workflowsDir, name), "utf8");
      expect(content, name).toContain("uses: ./.github/actions/d1-preflight");
      expect(content, name).toContain('threshold-percent: "60"');
      const materializationGuard = name === "etl-infolobby-scheduled.yml"
        ? "github.event_name == 'workflow_dispatch' && steps.infolobby-ingest.outputs.has_records == 'true' && inputs.skip_d1 != true && steps.d1-quota.outputs.proceed == 'true'"
        : "github.event_name == 'workflow_dispatch' && steps.d1-quota.outputs.proceed == 'true'";
      expect(content, name).toContain(materializationGuard);
      expect(content, name).toContain("steps.d1-quota.outputs.proceed == 'true'");
    }
    const infolobby = fs.readFileSync(path.join(workflowsDir, "etl-infolobby-scheduled.yml"), "utf8");
    expect(infolobby).toContain("data:materialize:optional");
    expect(infolobby).toContain("D1 pospuesto por asset no disponible");
  });

  it("11a. Contraloría publica en R2/Pages sin depender de D1", () => {
    const contraloria = fs.readFileSync(path.join(workflowsDir, "etl-contraloria.yml"), "utf8");
    expect(contraloria).not.toMatch(/d1-preflight|data:materialize:optional|wrangler d1/i);
    expect(contraloria).toContain("npm run data:publish");
    expect(contraloria).toContain("npm run data:publish:static -- --groups contraloria");
    expect(contraloria).toContain("D1 no participa en este ETL");
  });

  it("11a. SINIM conserva publicación R2 y verificación sin extracción ni D1", () => {
    const sinim = fs.readFileSync(path.join(workflowsDir, "etl-sinim.yml"), "utf8");
    expect(sinim).not.toMatch(/d1-preflight|data:materialize|wrangler d1/i);
    expect(sinim).toContain("verify_release_only:");
    expect(sinim).toContain("if: inputs.verify_release_only != true");
    expect(sinim).toContain("--required-files data/lake/projections/v1/sinim.json");
    expect(sinim).toContain("--only-files data/lake/projections/v1/sinim.json --force");
    expect(sinim).toContain("npm run data:publish:static -- --groups sinim");
    expect(sinim).toContain("contents: read");
    const guard = fs.readFileSync(path.join(workflowsDir, "etl-publication-guard.yml"), "utf8");
    expect(guard).toContain("STATIC_PUBLICATION_RESULT_INVALID");
    expect(guard).toContain("return steps[0].conclusion === 'success'");
  });

  it("11a. DIPRES verifica proyección y subset sin extracción, publicación ni D1", () => {
    const dipres = fs.readFileSync(path.join(workflowsDir, "etl-dipres.yml"), "utf8");
    expect(dipres).not.toMatch(/d1-preflight|data:materialize|wrangler d1/i);
    expect(dipres).toContain("verify_release_only:");
    expect(dipres.match(/if: inputs.verify_release_only != true/g)).toHaveLength(3);
    expect(dipres).toContain("if: inputs.verify_release_only == true");
    expect(dipres).toContain("--required-files data/lake/projections/v1/presupuesto.json,data/lake-subsets/presupuesto.subset.json");
    expect(dipres).toContain("--only-files data/lake/projections/v1/presupuesto.json,data/lake-subsets/presupuesto.subset.json --force");
    expect(dipres).toContain("npm run data:publish:static -- --groups dipres");
    expect(dipres).toContain("contents: read");
    const guard = fs.readFileSync(path.join(workflowsDir, "etl-publication-guard.yml"), "utf8");
    expect(guard).toMatch(/\[[^\]]*'ETL Trimestral - DIPRES Presupuestos'[^\]]*\]\.includes/);
    expect(guard).toContain("return steps[0].conclusion === 'success'");
  });

  it("11a. InfoProbidad verifica su release sin extracción, publicación ni D1", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "etl-infoprobidad.yml"), "utf8");
    expect(workflow).not.toMatch(/d1-preflight|data:materialize|wrangler d1/i);
    expect(workflow).toContain("verify_release_only:");
    expect(workflow.match(/if: inputs.verify_release_only != true/g)).toHaveLength(3);
    expect(workflow).toContain("if: inputs.verify_release_only == true");
    expect(workflow).toContain("--required-files data/lake/projections/v1/infoprobidad.json,data/lake-subsets/infoprobidad.subset.json");
    expect(workflow).toContain("--only-files data/lake/projections/v1/infoprobidad.json,data/lake-subsets/infoprobidad.subset.json --force");
    expect(workflow).toContain("npm run data:publish:static -- --groups infoprobidad");
    expect(workflow).toContain("contents: read");
    const guard = fs.readFileSync(path.join(workflowsDir, "etl-publication-guard.yml"), "utf8");
    expect(guard).toMatch(/\[[^\]]*'ETL Mensual - InfoProbidad DIP'[^\]]*\]\.includes/);
    expect(guard).toContain("return steps[0].conclusion === 'success'");
  });

  it("11b. El histórico de gastos públicos se publica en R2/Pages sin materializar en D1", () => {
    const expenses = fs.readFileSync(path.join(workflowsDir, "etl-expenses.yml"), "utf8");
    expect(expenses).not.toMatch(/d1-preflight|data:materialize/);
    expect(expenses).toContain("npm run data:publish");
    expect(expenses).toContain("npm run data:publish:static -- --groups gastos");
    expect(expenses).toContain("node scripts/verify-expense-release.mjs --required");
  });

  it("11b. El despliegue sólo de interfaz rehidrata Movimientos desde el manifiesto R2 fijado", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "pages-ui-refresh.yml"), "utf8");
    expect(workflow).toContain("name: Rehidratar Movimientos desde el release vigente de R2");
    expect(workflow).toContain("--manifest-file .ci-data-version/static-site-manifest.json --required-files data/movimientos.json --only-files data/movimientos.json --force");
    expect(workflow).not.toContain('git show "${GITHUB_SHA}:transparencia-app/data/movimientos.json"');
  });

  it("11c. La verificación post-promoción valida la marca estable de la Home", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "pages-promote-artifact.yml"), "utf8");
    expect(workflow).toContain("grep -F '<title>Datos públicos de Chile para fiscalizar | El Cambiómetro</title>'");
    expect(workflow).toContain("grep -F 'Datos públicos de Chile'");
    expect(workflow).not.toContain('grep -F "La información pública"');
  });

  it("11d. La reparación de votos valida sólo los períodos completos que staged reemplazará", () => {
    const workflow = fs.readFileSync(path.join(workflowsDir, "repair-senado-votaciones-staged.yml"), "utf8");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("from:");
    expect(workflow).toContain("to:");
    expect(workflow).toContain("SENADO_REPAIR_RANGE_START_MUST_BE_MONTH_START");
    expect(workflow).toContain("SENADO_REPAIR_RANGE_END_MUST_BE_MONTH_END_OR_TODAY");
    expect(workflow).toContain("assertSenateVotePeriodPreserved");
    expect(workflow).toContain("for (const { period, recordCount } of summary.periods)");
    expect(workflow).toContain("SENADO_REPAIR_COUNT_MISMATCH");
    expect(workflow).toContain("for (const period of summary.periods)");
    expect(workflow).toContain("R2_REPAIR_STORAGE_USAGE_UNVERIFIED");
    expect(workflow).not.toContain("storage-before.json --remote || true");
    expect(workflow).not.toContain('["2026-08", "2026-09"]');
  });

  it("12. Los ETL de personal y CPLT publican R2 sin pasos D1 automáticos", () => {
    const personal = fs.readFileSync(path.join(workflowsDir, "etl-personal-apoyo.yml"), "utf8");
    const personalSenado = fs.readFileSync(path.join(workflowsDir, "etl-personal-apoyo-senado.yml"), "utf8");
    const cplt = fs.readFileSync(path.join(workflowsDir, "etl-cplt.yml"), "utf8");
    expect(personal).toContain("--source camara");
    expect(personalSenado).toContain("--source senado");
    expect(personal).toContain("--skip-d1");
    expect(personalSenado).toContain("--skip-d1");
    expect(personal).not.toMatch(/d1-preflight|data:materialize/);
    expect(personalSenado).not.toMatch(/d1-preflight|data:materialize/);
    expect(personal).toContain("Publicar personal de apoyo sólo en R2");
    expect(cplt).toContain("data:finalize:cplt:r2");
    expect(cplt).not.toMatch(/d1-preflight|data:record:cplt-state/);
  });

  it("13. El preflight siempre deja un diagnóstico aunque Analytics D1 no responda", () => {
    const action = fs.readFileSync(path.join(root, "..", ".github", "actions", "d1-preflight", "action.yml"), "utf8");

    expect(action).toContain('if [[ ! -s "$D1_USAGE_OUTPUT" ]]');
    expect(action).toContain("D1_ANALYTICS_UNAUTHORIZED_OR_UNAVAILABLE");
    expect(action).toContain("D1_USAGE_OUTPUT");
  });
});
