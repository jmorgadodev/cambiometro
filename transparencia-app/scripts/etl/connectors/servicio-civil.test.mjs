import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const snapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "remuneraciones-servicio-civil.json"), "utf8"));

describe("snapshot oficial del Servicio Civil", () => {
  it("conserva los cuatro datasets descargables y sus checksums", () => {
    expect(snapshot.datasets).toHaveLength(4);
    expect(snapshot.datasets.every((dataset) => dataset.url.startsWith("https://reporte.serviciocivil.cl/"))).toBe(true);
    expect(snapshot.datasets.every((dataset) => /^[a-f0-9]{64}$/.test(dataset.checksumSha256))).toBe(true);
  });

  it("separa nombramientos de convocatorias y no inventa pagos individuales", () => {
    const appointments = snapshot.records.filter((record) => record.sourceType === "appointment");
    const calls = snapshot.records.filter((record) => record.sourceType === "official_call");
    expect(appointments.length).toBeGreaterThan(0);
    expect(calls.length).toBeGreaterThan(0);
    expect(appointments.every((record) => record.montoBruto === null && record.estadoRegistro === "nombramiento_publicado")).toBe(true);
    expect(calls.every((record) => record.estadoRegistro === "renta_referencial")).toBe(true);
  });
});
