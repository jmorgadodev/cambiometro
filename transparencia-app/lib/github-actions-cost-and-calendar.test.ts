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

  it("2. Workflows disparados por push / pull_request tienen paths-ignore para *.md, docs y auditorias", () => {
    const triggerWorkflows = ["quality.yml", "build-e2e.yml", "codeql.yml"];

    for (const file of triggerWorkflows) {
      const filePath = path.join(workflowsDir, file);
      expect(fs.existsSync(filePath), `Debe existir ${file}`).toBe(true);

      const content = fs.readFileSync(filePath, "utf8");
      expect(content, `${file} debe contener paths-ignore`).toContain("paths-ignore:");
      expect(content, `${file} debe ignorar archivos .md`).toContain("**/*.md");
      expect(content, `${file} debe ignorar docs/`).toContain("docs/**");
      expect(content, `${file} debe ignorar auditoria_integridad_datos/`).toContain("auditoria_integridad_datos/**");
    }
  });

  it("3. CERO pasos de deploy en workflows de cron / ETL (Deploy SIEMPRE es local)", () => {
    for (const file of workflowFiles) {
      const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
      const hasSchedule = content.includes("schedule:") || content.includes("cron:");

      if (hasSchedule) {
        // Ningún workflow programado puede contener comandos de despliegue
        expect(content, `El workflow programado ${file} NO debe contener comandos de deploy`).not.toMatch(/opennextjs-cloudflare\s+deploy/i);
        expect(content, `El workflow programado ${file} NO debe invocar npm run deploy`).not.toMatch(/npm\s+run\s+deploy/i);
      }
    }
  });

  it("4. Calendario ETL: los procesos oficiales tienen sus crons exactos en YAML", () => {
    const cronMap: Record<string, string | null> = {
      "etl-daily.yml": "0 7 * * *",
      "etl-chilecompra.yml": "0 8 * * 1",
      "etl-infolobby.yml": "30 8 * * 1",
      "etl-contraloria.yml": "0 9 2 * *",
      "etl-cplt.yml": "0 9 5 * *",
      "etl-ley-19862-full.yml": "0 6 2 * *",
      "etl-infoprobidad.yml": "0 9 10 * *",
      "etl-dipres.yml": "0 9 1 1,4,7,10 *",
      "etl-sinim.yml": "0 9 1 3,9 *",
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

  it("7. usage-watch.yml existe y es estrictamente workflow_dispatch (cero minutos en crons)", () => {
    const watchPath = path.join(workflowsDir, "usage-watch.yml");
    expect(fs.existsSync(watchPath)).toBe(true);
    const content = fs.readFileSync(watchPath, "utf8");

    expect(content).toContain("workflow_dispatch:");
    expect(content).not.toContain("schedule:");
    expect(content).toContain("api.github.com/users/$OWNER/settings/billing/actions");
  });
});
