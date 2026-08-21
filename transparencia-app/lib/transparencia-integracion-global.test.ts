import { describe, expect, it } from "vitest";
import { getLey19862Summary } from "./transferencias-data";
import { infoprobidadParaPolitico } from "./infoprobidad";
import { chilecompraParaCompradorPorRut } from "./chilecompra";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Auditoría e Integración Global de Datos Conectados", () => {
  it("verifica que getLey19862Summary consolide las transferencias a fundaciones y privados", () => {
    const summary = getLey19862Summary();
    expect(summary.kpis.total_transfers).toBeGreaterThanOrEqual(300000);
    expect(summary.kpis.total_monto_clp).toBeGreaterThan(10_000_000_000_000); // > 10 billones CLP
    expect(summary.kpis.total_receptores).toBeGreaterThan(10000);
    expect(summary.top_receptores.length).toBeGreaterThan(0);
    expect(summary.top_emisores.length).toBeGreaterThan(0);
  });

  it("verifica que infoprobidadParaPolitico consulte declaraciones de intereses y patrimonio", () => {
    const probidad = infoprobidadParaPolitico("Gabriel Boric");
    expect(probidad.url_portal_oficial).toContain("infoprobidad");
    expect(typeof probidad.tiene_declaracion).toBe("boolean");
  });

  it("verifica que ChileCompra asocie compradores sólo por RUT jurídico exacto", () => {
    const santiago = chilecompraParaCompradorPorRut("69.070.100-6");
    expect(santiago).not.toBeNull();
    if (santiago) {
      expect(santiago.monto_total_clp).toBeGreaterThan(0);
      expect(santiago.procesos).toBeGreaterThan(0);
      expect(santiago.name?.toLowerCase()).toContain("santiago");
    }

    expect(chilecompraParaCompradorPorRut("69.070.100-5")).toBeNull();
    expect(chilecompraParaCompradorPorRut("Municipalidad de Santiago")).toBeNull();
  });

  it("verifica que las fichas parlamentarias incluyan InfoProbidad y no tengan bloques vacíos", () => {
    const politicoPage = readFileSync(resolve("app/politico/[id]/page.tsx"), "utf8");
    expect(politicoPage).toContain("Declaración de Intereses y Patrimonio (DIP)");
    expect(politicoPage).toContain("infoprobidadParaPolitico");
    expect(politicoPage).toContain("InfoProbidad · Ley 20.880");
    expect(politicoPage).not.toContain("Incoherencias Detectadas: Discurso vs. Voto");
  });

  it("verifica que las fichas comunales incluyan el módulo de compras públicas ChileCompra", () => {
    const muniPage =
      readFileSync(resolve("app/municipalidades/[id]/page.tsx"), "utf8") +
      readFileSync(resolve("components/municipalidades/MunicipalidadDetailDashboardClient.tsx"), "utf8");
    expect(muniPage).toContain("Contrataciones Públicas y Adquisiciones OCDS");
    expect(muniPage).toContain("compras_publicas");
    expect(muniPage).toContain("ComprasPublicasMuni");
  });




  it("verifica que la portada enlace el explorador de transferencias", () => {
    const homePage = readFileSync(resolve("app/page.tsx"), "utf8");
    expect(homePage).toContain('href="/transferencias"');
    expect(homePage).toContain("Transferencias Ley 19.862");
    expect(homePage).toContain("totalCatalogRecords");
  });
});
