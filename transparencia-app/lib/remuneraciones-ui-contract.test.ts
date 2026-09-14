import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = join(process.cwd());

describe("interfaz de remuneraciones", () => {
  it("mantiene una sola experiencia de búsqueda y no vuelve a mostrar los resúmenes mensuales incompletos", () => {
    const unified = readFileSync(join(projectRoot, "components/remuneraciones/RemuneracionesUnifiedExplorer.tsx"), "utf8");
    const page = readFileSync(join(projectRoot, "app/remuneraciones-publicas/page.tsx"), "utf8");

    expect(unified).not.toContain("TransparencyActivaSummary");
    expect(unified).not.toContain("Historial mensual");
    expect(page).toContain("Abrir detalle completo");
    expect(page).not.toContain("Ver detalle mensual");
  });

  it("conserva el historial individual sin renderizar el gráfico mensual global", () => {
    const client = readFileSync(join(projectRoot, "components/remuneraciones/Remuneraciones38BisClient.tsx"), "utf8");

    expect(client).not.toContain("RemuneracionesHistoryChart");
    expect(client).not.toContain("Evolución mensual de esta remuneración");
    expect(client).toContain("Historial de montos publicados");
    expect(client).not.toContain("El navegador carga sólo la página solicitada");
    expect(client).toContain("Nuevos registros detectados");
    expect(client).toContain("Registros que ya no aparecen");
    expect(client).toContain("Cambios de remuneración detectados");
  });
});
