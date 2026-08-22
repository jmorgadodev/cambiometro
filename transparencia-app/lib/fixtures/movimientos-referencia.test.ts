import { describe, it, expect } from "vitest";
import { MOVIMIENTOS } from "@/lib/movimientos";

/**
 * Fixture Externo Congelado (Tarea H v6 — Cierre Definitivo)
 * Fuentes canónicas: Wikipedia Anexo Gabinetes, renunciaskast.cl, Comunicados Oficiales de Presidencia y Ley Chile BCN.
 * Valida mecánicamente que el dataset de movimientos contenga verbatim los nombres completos,
 * apellidos, cargos exactos (provincial vs regional) y secuencias sucesorias oficiales.
 */
describe("Fixture Externo Congelado: Referencia Oficial de Movimientos (Tarea H v6)", () => {
  // 1. 19-may SEGEGOB: Sedini Viancos → Alvarado Andrade (biministro)
  it("1. 19-may SEGEGOB: Sedini Viancos -> Alvarado Andrade (biministro)", () => {
    const mov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-19" && (m.cargo.includes("Secretaria General de Gobierno") || m.organismo.includes("SEGEGOB"))
    );
    expect(mov).toBeDefined();
    expect(mov?.salio?.nombre).toContain("Sedini Viancos");
    expect(mov?.entro?.nombre).toContain("Alvarado Andrade");
    expect(mov?.entro?.nombre.toLowerCase()).toContain("biministro");
  });

  // 2. 19-may Seguridad: Steinert → Arrau; MOP: Arrau → Louis de Grange Concha
  it("2. 19-may Seguridad: Steinert -> Arrau; MOP: Arrau -> Louis de Grange Concha", () => {
    // Seguridad
    const segMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-19" && m.cargo.includes("Ministra de Seguridad Pública")
    );
    expect(segMov).toBeDefined();
    expect(segMov?.salio?.nombre).toContain("Steinert");
    expect(segMov?.entro?.nombre).toContain("Arrau");

    // MOP
    const mopMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-19" && m.cargo.includes("Ministro de Obras Públicas")
    );
    expect(mopMov).toBeDefined();
    expect(mopMov?.salio?.nombre).toContain("Arrau");
    expect(mopMov?.entro?.nombre).toBe("Louis de Grange Concha");
  });

  // 3. 11-may Ciencia: Rafael Araos Bralic → Carolina Rossi Pantoja (s)
  it("3. 11-may Ciencia: Rafael Araos Bralic -> Carolina Rossi Pantoja (s)", () => {
    const cienciaMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-05-11" && m.cargo.includes("Ciencia")
    );
    expect(cienciaMov).toBeDefined();
    expect(cienciaMov?.salio?.nombre).toBe("Rafael Araos Bralic");
    expect(cienciaMov?.entro?.nombre).toBe("Carolina Rossi Pantoja (s)");
  });

  // 4. 2-jun Seguridad: Andrés Jouannet → Pilar Giannini Bravo; Prev. Delito: Ana Victoria Quintana → Gonzalo Guerrero Valle
  it("4. 2-jun Seguridad: Andrés Jouannet -> Pilar Giannini Bravo; Prev. Delito: Ana Victoria Quintana -> Gonzalo Guerrero Valle", () => {
    // Seguridad
    const segSubMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-06-02" && (m.cargo.includes("Seguridad") || m.cargo.includes("Interior"))
    );
    expect(segSubMov).toBeDefined();
    expect(segSubMov?.salio?.nombre).toBe("Andrés Jouannet");
    expect(segSubMov?.entro?.nombre).toBe("Pilar Giannini Bravo");

    // Prevención del Delito
    const prevMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-06-02" && m.cargo.includes("Prevención del Delito")
    );
    expect(prevMov).toBeDefined();
    expect(prevMov?.salio?.nombre).toBe("Ana Victoria Quintana");
    expect(prevMov?.entro?.nombre).toBe("Gonzalo Guerrero Valle");
  });

  // 5. 16-jun Mujer: Daniela Castro Araya → Marcia Raphael Mora
  it("5. 16-jun Mujer: Daniela Castro Araya -> Marcia Raphael Mora", () => {
    const mujerMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-06-16" && m.cargo.includes("Mujer")
    );
    expect(mujerMov).toBeDefined();
    expect(mujerMov?.salio?.nombre).toBe("Daniela Castro Araya");
    expect(mujerMov?.entro?.nombre).toBe("Marcia Raphael Mora");
  });

  // 6. 23-jul Hacienda: Juan Pablo Rodríguez Oyarzún → Tomás Bunster Bustamante (s); 10-ago: Sebastián Vallebona Espinosa
  it("6. 23-jul Hacienda: Juan Pablo Rodríguez Oyarzún -> Tomás Bunster Bustamante (s); 10-ago: Sebastián Vallebona Espinosa", () => {
    // 23-jul
    const hacJulMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-07-23" && m.cargo.includes("Subsecretario de Hacienda")
    );
    expect(hacJulMov).toBeDefined();
    expect(hacJulMov?.salio?.nombre).toBe("Juan Pablo Rodríguez Oyarzún");
    expect(hacJulMov?.entro?.nombre).toBe("Tomás Bunster Bustamante (s)");

    // 10-ago
    const hacAgoMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-10" && m.cargo.includes("Subsecretario de Hacienda")
    );
    expect(hacAgoMov).toBeDefined();
    expect(hacAgoMov?.salio?.nombre).toBe("Tomás Bunster Bustamante");
    expect(hacAgoMov?.entro?.nombre).toBe("Sebastián Vallebona Espinosa");
  });

  // 7. 13/14-ago Deporte: Natalia Duco Soler → Francisco Riveros Cantuarias; Andrés Otero Klein → Sofía Rengifo Ottone
  it("7. 13/14-ago Deporte: Natalia Duco Soler -> Francisco Riveros Cantuarias; Andrés Otero Klein -> Sofía Rengifo Ottone", () => {
    // Ministra de Deportes
    const depMinMov = MOVIMIENTOS.find(
      (m) => (m.fecha === "2026-08-13" || m.fecha === "2026-08-14") && m.cargo.includes("Ministro del Deporte")
    );
    expect(depMinMov).toBeDefined();
    expect(depMinMov?.salio?.nombre).toBe("Natalia Duco Soler");
    expect(depMinMov?.entro?.nombre).toBe("Francisco Riveros Cantuarias");

    // Subsecretaria de Deportes
    const depSubMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && m.cargo.includes("Subsecretaria del Deporte")
    );
    expect(depSubMov).toBeDefined();
    expect(depSubMov?.salio?.nombre).toBe("Andrés Otero Klein");
    expect(depSubMov?.entro?.nombre).toBe("Sofía Rengifo Ottone");
  });

  // 8. 14-ago Atacama: Sebastián Urrejola (Delegado Provincial Chañaral)
  it("8. 14-ago Atacama: Sebastián Urrejola (Delegado Provincial Chañaral)", () => {
    const atacamaMov = MOVIMIENTOS.find(
      (m) => m.fecha === "2026-08-14" && (m.salio?.nombre.includes("Urrejola") || m.organismo.includes("Chañaral"))
    );
    expect(atacamaMov).toBeDefined();
    expect(atacamaMov?.salio?.nombre).toBe("Sebastián Urrejola");
    expect(atacamaMov?.cargo).toBe("Delegado Presidencial Provincial de Chañaral");
    expect(atacamaMov?.organismo).toBe("Delegación Presidencial Provincial de Chañaral");
    expect(atacamaMov?.region).toBe("Región de Atacama");
  });
});
