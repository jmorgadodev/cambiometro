import { describe, it, expect } from "vitest";
import { getAllCrosses, listCrosses, listEntities, listRecords, listRelations } from "@/lib/data-platform-v1";
import { MAX_SANITY_RELATION_AMOUNT_CLP, paginate } from "@/lib/data-platform-core";
import { formatMontoConsolidado, formatCLP } from "@/lib/format";
import { traducirPredicado, traducirTipoEntidad } from "@/components/cruces/CrucesDetailDrawer";

describe("X6 Final — Entidades Instantáneas + Contexto + Sanidad + Votaciones", () => {
  it("1. Sanidad de montos consolidados: cero montos > $100.000 MM CLP", () => {
    const all = getAllCrosses();
    expect(all.length).toBeGreaterThan(500);

    for (const cross of all) {
      if (cross.totalAmountClp) {
        expect(cross.totalAmountClp).toBeLessThanOrEqual(MAX_SANITY_RELATION_AMOUNT_CLP);
        expect(cross.totalAmountClp).toBeLessThan(100_000_000_000_000); // Cero montos de 14 dígitos
      }
    }
  });

  it("2. Formato con 3 cifras significativas: nunca cadenas de 14 dígitos", () => {
    expect(formatMontoConsolidado(20_736_541_839)).toBe("$20.737 MM");
    expect(formatMontoConsolidado(1_250_000_000)).toBe("$1.250 MM");
    expect(formatMontoConsolidado(78_703_387)).toBe("$78,7 M");
    expect(formatMontoConsolidado(450_000)).toBe("$450.000");
    expect(formatMontoConsolidado(0)).toBe("No monetario");
    expect(formatMontoConsolidado(null)).toBe("No monetario");
  });

  it("3. Semántica de aristas de votaciones: parlamentario real -> boletín / proyecto", () => {
    const all = getAllCrosses();
    const voteCrosses = all.filter(
      (c) => c.relation.predicate === "voted_on_bill" || c.relation.predicate === "cast_vote"
    );

    expect(voteCrosses.length).toBeGreaterThan(0);

    for (const vote of voteCrosses) {
      // Origen debe ser persona
      expect(vote.fromEntity.kind).toBe("person");
      expect(vote.fromEntity.id).toMatch(/^person-/);
      expect(vote.fromEntity.name).not.toContain("Cámara");

      // Destino debe ser proyecto de ley / boletín
      expect(vote.toEntity.id).not.toBe(vote.fromEntity.id);
      expect(vote.toEntity.name.toLowerCase()).toMatch(/boletín|proyecto/);

      // Evidencia debe tener opción y detalle
      expect(vote.evidence.length).toBeGreaterThan(0);
      expect(vote.evidence[0].sourceId).toBe("camara");
    }
  });

  it("4. Fila 1 de /cruces tiene monto plausible y variedad >= 3 tipos en página 1", () => {
    const all = getAllCrosses();
    const page1 = all.slice(0, 20);

    // Fila 1 debe tener monto plausible si es monetaria
    if (page1[0].totalAmountClp) {
      expect(page1[0].totalAmountClp).toBeLessThanOrEqual(MAX_SANITY_RELATION_AMOUNT_CLP);
    }

    const types = new Set(
      page1.map((r) => {
        const src = r.evidence[0]?.sourceId || "";
        if (src === "contraloria") return "Auditorías";
        if (src === "infoprobidad") return "Declaraciones";
        if (src === "chilecompra") return "Compras";
        if (src === "infolobby") return "Lobby";
        if (src === "ley-19862") return "Transferencias";
        if (src === "camara" || src === "senado") return "Votaciones";
        return "Otro";
      })
    );

    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("5. Unificación de paginate: función canónica única", () => {
    const items = Array.from({ length: 55 }, (_, i) => ({ id: `item-${i}` }));
    const page1 = paginate(items, 20);
    expect(page1.data.length).toBe(20);
    expect(page1.total).toBe(55);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = paginate(items, 20, page1.nextCursor!);
    expect(page2.data.length).toBe(20);
    expect(page2.data[0].id).toBe("item-20");
  });

  it("6. Traducción al español: 100% de tipos y predicados traducidos", () => {
    expect(traducirTipoEntidad("public_body")).toBe("Organismo público");
    expect(traducirTipoEntidad("person")).toBe("Persona natural");
    expect(traducirTipoEntidad("company")).toBe("Empresa");
    expect(traducirTipoEntidad("supplier")).toBe("Proveedor");

    expect(traducirPredicado("holds_office")).toBe("Ejerce cargo en");
    expect(traducirPredicado("voted_on_bill")).toBe("Votó sobre");
    expect(traducirPredicado("awarded_contract")).toBe("Se adjudicó contrato de");
    expect(traducirPredicado("audited")).toBe("Auditado / fiscalizado por");
    expect(traducirPredicado("received_transfer_from")).toBe("Recibió transferencia de");
  });
});
