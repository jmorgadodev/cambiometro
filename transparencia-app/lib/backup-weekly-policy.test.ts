import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const workflow = readFileSync(resolve(appRoot, "..", ".github", "workflows", "backup-weekly.yml"), "utf8");
const backup = readFileSync(resolve(appRoot, "scripts", "backup-weekly.mjs"), "utf8");
const drill = readFileSync(resolve(appRoot, "scripts", "restore-drill.mjs"), "utf8");

describe("política de backup sin consumo accidental de D1", () => {
  it("verifica el archivo compacto y exige una acción manual para duplicar el lake", () => {
    expect(workflow).toContain("inputs.backup_lake == true");
    expect(workflow).toContain("CAMBIOMETRO_FULL_LAKE_BACKUP");
    expect(workflow).toContain("r2-compact-backups.mjs --mode=verify-remote");
    expect(backup).toContain('process.env.BACKUP_LAKE_COPY === "1"');
    expect(backup).toContain('process.env.BACKUP_LAKE_CONFIRM === "CAMBIOMETRO_FULL_LAKE_BACKUP"');
  });
  it("mantiene el backup programado en R2 y exige confirmación manual para D1", () => {
    expect(workflow).toContain("Backup Semanal (R2; D1 manual)");
    expect(workflow).toContain("BACKUP_D1:");
    expect(workflow).toContain("inputs.backup_d1 == true");
    expect(workflow).toContain("CAMBIOMETRO_D1_BACKUP");
    expect(backup).toContain('process.env.BACKUP_D1 === "1"');
    expect(backup).toContain('process.env.D1_BACKUP_CONFIRM === "CAMBIOMETRO_D1_BACKUP"');
    expect(backup).toContain("export D1 omitido");
    expect(backup).toContain("CAMBIOMETRO_R2_RETENTION_DELETE");
    expect(backup).toContain("limpieza por retención omitida");
  });

  it("permite validar el respaldo R2 sin descargar ni restaurar un dump D1", () => {
    expect(drill).toContain('mode: "R2_ONLY"');
    expect(drill).toContain("d1Skipped: true");
    expect(drill).toContain("r2Head(BACKUP_BUCKET, sampleKey)");
    expect(drill).toContain("if (!inventory.d1)");
  });

  it("rechaza un inventario con cero objetos antes de considerar cualquier dump D1", () => {
    expect(drill).toContain("lakeObjects = getR2LakeObjects(inventory);");
    expect(drill).toContain("R2_BACKUP_INVENTORY_EMPTY");
    expect(drill.indexOf("getR2LakeObjects(inventory)")).toBeLessThan(drill.indexOf("Paso 3: descargar dump"));
  });
});
