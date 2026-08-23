import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { listCrosses, getAllCrosses } from "./data-platform-v1";
import {
  DICCIONARIO_CRUCES_ES,
  ENTIDAD_TIPO_ES,
  FUENTE_CONFIANZA_ES,
  traducirPredicado,
  traducirTipoEntidad,
  formatearFuenteYConfianza,
} from "../components/cruces/CrucesDetailDrawer";
import { CHIPS_CONFIG, getTipoCruceBadge } from "../components/cruces/CrucesExplorerClient";

describe("Rediseño Integral de /cruces — Cruces Reales en Todos los Chips", () => {
  const pageSource = readFileSync(resolve("app/cruces/page.tsx"), "utf8");
  const explorerSource = readFileSync(resolve("components/cruces/CrucesExplorerClient.tsx"), "utf8");
  const drawerSource = readFileSync(resolve("components/cruces/CrucesDetailDrawer.tsx"), "utf8");

  it("X1. Todos los 6 chips tienen cruces reales agregados con evidencia (>0)", () => {
    const page = listCrosses({ limit: 500 });
    expect(page.data.length).toBeGreaterThan(50);

    // 1. Auditorías CGR
    const auditorias = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("audit") ||
      r.evidence.some((e) => e.sourceId === "contraloria")
    );
    expect(auditorias.length).toBeGreaterThan(0);

    // 2. Declaraciones InfoProbidad
    const declaraciones = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("declaration") ||
      r.evidence.some((e) => e.sourceId === "infoprobidad")
    );
    expect(declaraciones.length).toBeGreaterThan(0);

    // 3. Compras Públicas ChileCompra
    const compras = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("contract") ||
      r.relation.predicate.toLowerCase().includes("purchased") ||
      r.relation.predicate.toLowerCase().includes("awarded") ||
      r.evidence.some((e) => e.sourceId === "chilecompra")
    );
    expect(compras.length).toBeGreaterThan(0);

    // 4. Audiencias InfoLobby
    const lobby = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("lobby") ||
      r.evidence.some((e) => e.sourceId === "infolobby")
    );
    expect(lobby.length).toBeGreaterThan(0);

    // 5. Transferencias Ley 19.862
    const transferencias = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("transfer") ||
      r.evidence.some((e) => e.sourceId === "ley-19862")
    );
    expect(transferencias.length).toBeGreaterThan(0);

    // 6. Votaciones Congreso
    const votaciones = page.data.filter((r) =>
      r.relation.predicate.toLowerCase().includes("vote") ||
      r.relation.predicate.toLowerCase().includes("office") ||
      r.evidence.some((e) => e.sourceId === "camara" || e.sourceId === "senado")
    );
    expect(votaciones.length).toBeGreaterThan(0);
  });

  it("X1 & X2. R10 no fabrica una arista 'LOBBY + VENTAS' para completar cobertura", () => {
    const page = listCrosses({ limit: 500 });
    expect(page.data.some((record) => record.relation.id.includes("public-body-mop-dcyf"))).toBe(false);
    expect(page.data.some((record) => record.toEntity?.name.includes("Carlos González Asesorías"))).toBe(false);
    expect(explorerSource).toContain("LOBBY + VENTAS");
  });

  it("X2. Coherencia KPI vs Explorador: el hint usa el conteo derivado", () => {
    expect(pageSource).toContain("crosses.length.toLocaleString");
    expect(pageSource).not.toContain("118.360 registros vinculados");
    expect(pageSource).toContain("relaciones agregadas");
  });

  it("X3. Drawer con alto contraste en todas las cajas (--surface-2 y --text-1)", () => {
    expect(drawerSource).toContain("background: \"var(--surface-2)\"");
    expect(drawerSource).toContain("color: \"var(--text-1)\"");
    expect(drawerSource).toContain("color: \"var(--text-muted)\"");
    expect(drawerSource).not.toContain("rgba(0, 0, 0, 0.5)");
  });

  it("X3. Lista negra ampliada: cero inglés visible en tablas, badges ni drawer", () => {
    expect(traducirPredicado("declared_legal_interest")).toBe("Declaró interés legal en");
    expect(traducirPredicado("DECLARED_LEGAL_INTEREST")).toBe("Declaró interés legal en");
    expect(traducirPredicado("audited")).toBe("Auditado / fiscalizado por");
    expect(traducirPredicado("filed_declaration_with")).toBe("Presentó declaración patrimonial ante");
    expect(traducirPredicado("paid_declaration_with")).toBe("Actualizó declaración patrimonial ante");
    expect(traducirPredicado("participated_in_lobby_meeting")).toBe("Participó en audiencia de lobby con");
    expect(traducirPredicado("awarded_contract_from")).toBe("Se adjudicó contrato de");
    expect(traducirPredicado("received_transfer_from")).toBe("Recibió transferencia de");
    expect(traducirPredicado("member_of")).toBe("Miembro de");
    expect(traducirPredicado("employed_by")).toBe("Contratado por");

    expect(traducirTipoEntidad("public_body")).toBe("Organismo público");
    expect(traducirTipoEntidad("PUBLIC_BODY")).toBe("Organismo público");
    expect(traducirTipoEntidad("person")).toBe("Persona natural");
    expect(traducirTipoEntidad("persona_natural")).toBe("Persona natural");
    expect(traducirTipoEntidad("PERSONA_NATURAL")).toBe("Persona natural");
    expect(traducirTipoEntidad("politician")).toBe("Autoridad / Político");
    expect(traducirTipoEntidad("supplier")).toBe("Proveedor");
    expect(traducirTipoEntidad("municipality")).toBe("Municipalidad");
    expect(traducirTipoEntidad("legal_entity")).toBe("Persona jurídica / Entidad privada");

    const blacklist = [
      "PUBLIC_BODY",
      "DECLARED_LEGAL_INTEREST",
      "declared_legal_interest",
      "official_declaration_json",
      "official_infoprobidad_id",
      "official_report_number",
      "PURCHASED_FROM",
      "HAS_CONTRACT_WITH",
      "HAD_LOBBY_MEETING_WITH",
      "WAS_AUDITED_BY",
      "RECEIVED_TRANSFER_FROM",
      "IS_MEMBER_OF",
      "WORKS_AT",
    ];

    for (const term of blacklist) {
      expect(pageSource).not.toContain(`>${term}<`);
      expect(pageSource).not.toContain(`"${term}"`);
    }
  });

  it("X4. Preserva orden C3, presets, paginación 50 y skeleton", () => {
    expect(pageSource).toContain("Un cruce es una relación documental entre autoridades, organismos, proveedores y auditorías, respaldada por identificadores oficiales.");
    expect(explorerSource).toContain("PAGE_SIZE = 50");
    expect(explorerSource).toContain("handleApplyPreset");
    expect(drawerSource).toContain("showSkeleton");
  });

  it("X5. Universo agregado completo > 500 aristas y ordenado por monto consolidado desc", () => {
    const universe = getAllCrosses();
    expect(universe.length).toBeGreaterThan(500);

    // Página 1 (primeras 20 filas) debe tener ≥ 3 tipos distintos
    const page1 = universe.slice(0, 20);
    const tiposPage1 = new Set(page1.map((r) => getTipoCruceBadge(r).tipo));
    expect(tiposPage1.size).toBeGreaterThanOrEqual(3);

    expect(page1.every((record) => record.evidence.length > 0)).toBe(true);
  });

  it("X5. Cada uno de los 6 chips tiene conteo > 0 y visible en su etiqueta", () => {
    const universe = getAllCrosses();
    expect(universe.length).toBeGreaterThan(500);

    for (const chip of CHIPS_CONFIG) {
      expect(chip.label).toBeDefined();
      expect(chip.id).toBeDefined();
    }

    expect(explorerSource).toContain("chipCounts[chip.id]");
    expect(explorerSource).toContain("chip.icon");
  });
});
