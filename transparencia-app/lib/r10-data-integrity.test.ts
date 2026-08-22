import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findBuyerByVerifiedRut,
  projectOfficialBuyer,
} from "../scripts/etl/r10-chilecompra.mjs";

const buyer = {
  id: "public-body-chilecompra-rut-609100001",
  name: "ORGANISMO OFICIAL",
  rut_juridico: "60.910.000-1",
  monto_total_clp: 12_345_678,
  procesos: 2,
  months: [{ period: "2026-07", monto_total_clp: 12_345_678, procesos: 2 }],
  top: [
    {
      title: "Adjudicación oficial",
      proveedor: "PROVEEDOR OFICIAL SPA",
      proveedor_id: "provider-1",
      monto_clp: 12_345_678,
      fecha: "2026-07-01",
      url: "https://api.mercadopublico.cl/APISOCDS/OCDS/award/1",
      ocid: "ocds-70d2nz-1",
    },
  ],
  anomalies: [{
    id: "chilecompra-v7-official",
    severity: "ALTA",
    validation: "V7",
    violations: ["monto_relacion"],
    monto_oficial_clp: 100_000_000_001,
    title: "Orden oficial fuera de rango",
    source_url: "https://official.example/order",
    excluded_from_totals_and_rankings: true,
  }],
};

describe("R10 — ninguna compra inventada entra a proyecciones", () => {
  it("une compradores únicamente por RUT jurídico válido y exacto", () => {
    expect(findBuyerByVerifiedRut([buyer], "60.910.000-1")).toBe(buyer);
    expect(findBuyerByVerifiedRut([buyer], "609100001")).toBe(buyer);
    expect(findBuyerByVerifiedRut([buyer], "60.910.000-2")).toBeNull();
    expect(findBuyerByVerifiedRut([buyer], null)).toBeNull();
  });

  it("proyecta sólo valores y adjudicaciones presentes en ChileCompra", () => {
    const projection = projectOfficialBuyer(buyer);
    expect(projection).not.toBeNull();
    if (!projection) throw new Error("R10_PROJECTION_MISSING");
    expect(projection).toMatchObject({
      rut_comprador: "60.910.000-1",
      monto_total_clp: 12_345_678,
      procesos_count: 2,
      ordenes_count: null,
      metodo_enlace: "RUT_EXACTO",
    });
    expect(projection.top_compras).toEqual([
      expect.objectContaining({
        titulo: "Adjudicación oficial",
        proveedor: "PROVEEDOR OFICIAL SPA",
        monto_clp: 12_345_678,
        ocid: "ocds-70d2nz-1",
      }),
    ]);
    expect(projection.procesos).toEqual([]);
    expect(projection.anomalias_integridad).toEqual([
      expect.objectContaining({
        id: "chilecompra-v7-official",
        severity: "ALTA",
        validation: "V7",
        monto_oficial_clp: 100_000_000_001,
        excluded_from_totals_and_rankings: true,
      }),
    ]);
  });

  it("la ausencia de RUT o comprador oficial se representa como null", () => {
    expect(projectOfficialBuyer(null)).toBeNull();
    expect(projectOfficialBuyer({ ...buyer, rut_juridico: null })).toBeNull();
  });

  it("elimina generadores sintéticos de montos, órdenes y proveedores", () => {
    const sources = [
      "scripts/etl/generate-organismos-projection.ts",
      "scripts/build-chilecompra-v1.mjs",
      "scripts/rebuild-authoritative-municipalidades.mjs",
      "lib/servicios-publicos-data.ts",
      "lib/data-platform-v1.ts",
      "lib/funcionarios-fallback.ts",
      "scripts/census-data.mjs",
      "app/cruces/page.tsx",
      "app/servicios-publicos/page.tsx",
      "app/servicios-publicos/servicios-publicos-client.tsx",
      "app/politico/[id]/page.tsx",
      "components/PoliticoScoreHeader.tsx",
      "components/PersonalApoyoMensual.tsx",
      "components/VotacionesHistorial.tsx",
      "scripts/etl/generate-partidos-stats.ts",
      "lib/partido-estadisticas.ts",
      "lib/scores.ts",
      "scripts/rebuild-authoritative-attendance.mjs",
      "scripts/etl/ley19862-projection.mjs",
      "app/transferencias/page.tsx",
      "components/transferencias/TransferenciasExplorerClient.tsx",
      "app/cruces/page.tsx",
      "app/personas/page.tsx",
      "components/personas/PersonasUniversalClient.tsx",
      "components/municipalidades/MunicipalidadDetailDashboardClient.tsx",
    ].map((file) => readFileSync(resolve(file), "utf8")).join("\n");

    expect(sources).not.toMatch(/presVigente\s*\*\s*0\.34/);
    expect(sources).not.toMatch(/dotacion(?:Real)?\s*\*\s*32_000_000/);
    expect(sources).not.toMatch(/dotacion(?:Real)?\s*\*\s*(?:1_750_000|2_150_000|2_450_000)/);
    expect(sources).not.toMatch(/dotacionReal\s*=\s*\d+/);
    expect(sources).not.toContain("buildCentralGovernmentFuncionarios");
    expect(sources).not.toContain("NOMBRES_MASC");
    expect(sources).not.toContain("directivosBase");
    expect(sources).not.toContain("68_450_000_000");
    expect(sources).not.toContain("36_813");
    expect(sources).not.toContain("83_420_000_000_000");
    expect(sources).not.toContain("45_180_000_000_000");
    expect(sources).not.toMatch(/totalConPresupuesto\s*\?\?\s*69/);
    expect(sources).not.toMatch(/poblacion_censo_2024\s*\|\|\s*25000/);
    expect(sources).not.toMatch(/superficie_km2\s*\|\|\s*350/);
    expect(sources).not.toContain("Sin coincidencias en 1.2M nóminas");
    expect(sources).not.toContain("0 informes SIAPER");
    expect(sources).not.toContain("Máx. horas extras del personal: 0 h");
    expect(sources).not.toMatch(/totalSesiones[^\n]+:\s*100/);
    expect(sources).not.toMatch(/presentes[^\n]+:\s*100/);
    expect(sources).not.toMatch(/ultimoPeriodo\s*\|\|\s*"2026-06"/);
    expect(sources).not.toMatch(/pctDisciplina:\s*100/);
    expect(sources).not.toContain("charCodeSum");
    expect(sources).not.toContain("sesionesTotales = isDip ? 177 : 180");
    expect(sources).not.toContain("score_gastos: 80");
    expect(sources).not.toContain("score_patrimonio: 85");
    expect(sources).toContain("SCORES_SEED: ScoreProbidad[] = []");
    expect(sources).not.toMatch(/planta_pct:\s*28\.5/);
    expect(sources).not.toMatch(/recordCount\)\s*\|\|\s*\(muni\.poblacion/);
    expect(sources).not.toContain("Entel Chile S.A.");
    expect(sources).not.toContain("Sonda S.A.");
    expect(sources).not.toContain("Consorcio Ambiental de Chile SpA");
    expect(sources).not.toContain("Carlos González Asesorías e Insumos E.I.R.L.");
    expect(sources).not.toContain("Proveedor Adjudicado");
    expect(sources).not.toContain("Proveedor Registrado");
    expect(sources).not.toContain("Proveedor no informado en OCDS");
    expect(sources).not.toContain("Contratación Pública");
    expect(sources).not.toContain("Autoridad sin nombre publicado");
    expect(sources).not.toContain("Declarante Oficial");
    expect(sources).not.toContain("Entidad Receptora Privada");
    expect(sources).not.toContain("2026-05-15");
    expect(sources).not.toContain("2026-06-15");
    expect(sources).not.toContain("2026-07-15");
    expect(sources).not.toContain("1440000000");
    expect(sources).not.toContain("-OC${c + 1}");
    expect(sources).not.toContain("361.101");
    expect(sources).not.toContain("1.2M+");
    expect(sources).not.toContain("20.805");
    expect(sources).not.toContain("11.483");
    expect(sources).not.toContain("275 informes SIAPER");
    expect(sources).not.toContain('classification: t.classification || "Transferencia Corriente"');
  });

  it("representa como null cualquier dimensión municipal sin fuente oficial", () => {
    const source = readFileSync(resolve("scripts/rebuild-authoritative-municipalidades.mjs"), "utf8");
    const censusSource = readFileSync(resolve("scripts/census-data.mjs"), "utf8");
    expect(censusSource).not.toContain("municipalidades-data.json");
    expect(censusSource).toContain("CENSO_2024_OFICIAL =");
    expect(censusSource).toContain("Censo 2024 INE");
    expect(source).toContain("let alcalde = null");
    expect(source).toContain("partido_alcalde: alcalde?.partido_alcalde ?? null");
    expect(source).not.toContain("ALCALDES_CORREGIDOS");
    expect(source).not.toMatch(/const estimado =/);
    expect(source).not.toMatch(/poblacion_censo_2024 \* 580000/);
    expect(source).not.toMatch(/totalFunc \* 1650000/);
    expect(source).not.toMatch(/poblacion_censo_2024 \* 0\.815/);
    expect(source).not.toMatch(/Math\.round\(bruto \* 0\.78\)/);
    expect(source).toContain("redes_sociales: null");
    expect(source).toContain("padron_electoral_servel: null");
  });
});
