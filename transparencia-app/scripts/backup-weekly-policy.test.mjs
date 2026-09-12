import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const workflow = readFileSync(resolve(appRoot, "..", ".github", "workflows", "backup-weekly.yml"), "utf8");
const backup = readFileSync(resolve(appRoot, "scripts", "backup-weekly.mjs"), "utf8");
const drill = readFileSync(resolve(appRoot, "scripts", "restore-drill.mjs"), "utf8");

describe("política de backup sin consumo accidental de D1", () => {
  it("mantiene el backup programado en R2 y exige confirmación manual para D1", () => {
    expect(workflow).toContain("Backup Semanal (R2; D1 manual)");
    expect(workflow).toContain("BACKUP_D1:");
    expect(workflow).toContain("inputs.backup_d1 == true");
    expect(workflow).toContain("CAMBIOMETRO_D1_BACKUP");
    expect(backup).toContain('process.env.BACKUP_D1 === "1"');
    expect(backup).toContain('process.env.D1_BACKUP_CONFIRM === "CAMBIOMETRO_D1_BACKUP"');
    expect(backup).toContain("export D1 omitido");
  });

  it("permite validar el respaldo R2 sin descargar ni restaurar un dump D1", () => {
    expect(drill).toContain('mode: "R2_ONLY"');
    expect(drill).toContain("d1Skipped: true");
    expect(drill).toContain("r2Head(BACKUP_BUCKET, sampleKey)");
    expect(drill).toContain("if (!inventory.d1)");
  });
});
