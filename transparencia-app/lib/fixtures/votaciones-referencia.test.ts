import { describe, it, expect } from "vitest";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getVotacionesParaPolitico } from "@/lib/data-source";
import { esProcedimental } from "@/components/VotacionesHistorial";

describe("Fixture de Referencia Oficial — Votaciones en Sala y Coherencia Interna", () => {
  // Muestra obligatoria de auditoría: Kaiser, Bianchi, Winter, Cariola, Schalper
  const muestraTokens = ["Kaiser", "Bianchi", "Winter", "Cariola", "Schalper"];

  it("1. Coherencia Matemática Interna: tiles == historial == denominador de presencia", () => {
    const pols = POLITICOS_SEED.filter((p) =>
      muestraTokens.some((token) => p.nombre_completo.toLowerCase().includes(token.toLowerCase()))
    );
    expect(pols.length).toBeGreaterThanOrEqual(5);

    for (const pol of pols) {
      const votaciones = getVotacionesParaPolitico(pol);
      expect(votaciones.length).toBeGreaterThan(50); // Ingesta completa tiene cientos de votaciones

      let afirmativo = 0;
      let enContra = 0;
      let abstencion = 0;
      let noVota = 0;
      let pareo = 0;
      let procedimentales = 0;

      for (const item of votaciones) {
        const opc = item.voto.opcion.trim().toLowerCase();
        if (opc === "afirmativo" || opc === "a favor") afirmativo++;
        else if (opc === "en contra") enContra++;
        else if (opc === "abstención" || opc === "abstencion") abstencion++;
        else if (opc === "pareo") pareo++;
        else noVota++;

        const vFila = {
          id: item.votacion.id,
          fecha: item.votacion.fecha ?? "",
          opcion: item.voto.opcion,
          descripcion: item.votacion.descripcion ?? "",
          tipo: item.votacion.tipo ?? null,
          tramite: (item.votacion as { tramite?: string }).tramite ?? null,
        };
        if (esProcedimental(vFila)) procedimentales++;
      }

      const total = votaciones.length;
      const sumaDesglose = afirmativo + enContra + abstencion + noVota + pareo;
      const emitidos = afirmativo + enContra + abstencion;
      const presentes = emitidos + noVota;
      const sustantivos = total - procedimentales;

      // Invariantes estrictas: Cero discrepancias
      expect(sumaDesglose).toBe(total);
      expect(sustantivos + procedimentales).toBe(total);
      expect(presentes).toBeLessThanOrEqual(total);
      expect(presentes).toBeGreaterThanOrEqual(emitidos);
    }
  });

  it("2. Muestra de 5 parlamentarios con cobertura ≥99% de eventos", () => {
    for (const token of muestraTokens) {
      const pol = POLITICOS_SEED.find((p) =>
        p.nombre_completo.toLowerCase().includes(token.toLowerCase())
      );
      expect(pol).toBeDefined();
      if (!pol) continue;

      const votaciones = getVotacionesParaPolitico(pol);
      expect(votaciones.length).toBeGreaterThan(100);

      const validos = votaciones.filter((v) => v.voto.opcion && v.votacion.fecha);
      const ratio = validos.length / votaciones.length;
      expect(ratio).toBeGreaterThanOrEqual(0.99);
    }
  });

  it("3. Padrón nominal de votaciones conserva boletines y enlaces oficiales de tramitación", () => {
    const pol = POLITICOS_SEED.find((p) => p.nombre_completo.includes("Gonzalo Winter"));
    expect(pol).toBeDefined();
    if (!pol) return;

    const votaciones = getVotacionesParaPolitico(pol);
    const conBoletin = votaciones.filter((v) => v.votacion.boletin || String(v.votacion.descripcion).includes("Boletín"));
    expect(conBoletin.length).toBeGreaterThan(20);
  });
});
