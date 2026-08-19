import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllServiciosPublicos, getServicioPublicoById, SERVICIOS_PUBLICOS_SEED } from "./servicios-publicos";

describe("catálogo de servicios públicos", () => {
  it("incluye los organismos adicionales sin IDs duplicados", () => {
    const servicios = getAllServiciosPublicos();
    const ids = servicios.map((servicio) => servicio.id);

    expect(servicios.length).toBeGreaterThan(SERVICIOS_PUBLICOS_SEED.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("org-presidencia-de-la-republica");
    expect(getServicioPublicoById("org-presidencia-de-la-republica")?.nombre).toContain("Presidencia");
  });

  it("no usa evaluación dinámica ni filesystem en el runtime del Worker", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "lib", "servicios-publicos.ts"), "utf8");

    expect(source).not.toMatch(/eval\s*\(/);
    expect(source).not.toMatch(/require\s*\(\s*["'](?:fs|path)["']\s*\)/);
  });

  it("no muestra 'Descubierto Automáticamente' en las dependencias de los organismos", () => {
    const servicios = getAllServiciosPublicos();
    for (const servicio of servicios) {
      expect(servicio.ministerio_dependiente).not.toContain("Descubierto Automáticamente");
      expect(servicio.ministerio_dependiente).not.toContain("Descubierto Automaticamente");
      expect(servicio.ministerio_dependiente.length).toBeGreaterThan(0);
    }
  });

  it("la ficha individual y el catálogo eliminan botones de CSV y estados de carga infinitos", () => {
    const detailPage = fs.readFileSync(path.join(process.cwd(), "app/servicios-publicos/[id]/page.tsx"), "utf8");
    const client = fs.readFileSync(path.join(process.cwd(), "app/servicios-publicos/servicios-publicos-client.tsx"), "utf8");

    expect(detailPage).not.toContain("Exportar Nómina CSV");
    expect(detailPage).not.toContain("OrganismoFuncionariosList");
    expect(client).not.toContain("Exportar Nómina CSV");
    expect(client).toContain("ShareButton");
  });
});
