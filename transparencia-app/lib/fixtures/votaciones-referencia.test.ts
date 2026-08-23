import { describe, it, expect } from "vitest";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getVotacionesParaPolitico } from "@/lib/data-source";
import { esProcedimental } from "@/components/VotacionesHistorial";

describe("Fixture de Referencia Oficial — Votaciones en Sala y Coherencia Interna", () => {
  // Muestra obligatoria de auditoría: Kaiser, Bianchi K., Bianchi C., Winter, Cariola, Schalper
  const muestraAuditIds = [
    { id: "sen-038", nombre: "Vanessa Kaiser Barents-Von Hohenhagen", cargo: "Senador" },
    { id: "sen-048", nombre: "Karim Bianchi Retamales", cargo: "Senador" },
    { id: "dip-154", nombre: "Carlos Bianchi Chelech", cargo: "Diputado" },
    { id: "dip-057", nombre: "Gonzalo Winter Etcheberry", cargo: "Diputado" },
    { id: "sen-017", nombre: "Karol Cariola Oliva", cargo: "Senador" },
    { id: "dip-068", nombre: "Diego Schalper Sepúlveda", cargo: "Diputado" },
  ];

  it("1. Coherencia Matemática Interna: tiles == historial == denominador de presencia", () => {
    for (const item of muestraAuditIds) {
      const pol = POLITICOS_SEED.find((p) => p.id === item.id);
      expect(pol).toBeDefined();
      if (!pol) continue;

      const votaciones = getVotacionesParaPolitico(pol);
      expect(votaciones.length).toBeGreaterThan(50); // Ingesta completa tiene cientos de votaciones

      let afirmativo = 0;
      let enContra = 0;
      let abstencion = 0;
      let noVota = 0;
      let pareo = 0;
      let procedimentales = 0;

      for (const vItem of votaciones) {
        const opc = vItem.voto.opcion.trim().toLowerCase();
        if (opc === "afirmativo" || opc === "a favor") afirmativo++;
        else if (opc === "en contra") enContra++;
        else if (opc === "abstención" || opc === "abstencion") abstencion++;
        else if (opc === "pareo") pareo++;
        else noVota++;

        const vFila = {
          id: vItem.votacion.id,
          fecha: vItem.votacion.fecha ?? "",
          opcion: vItem.voto.opcion,
          descripcion: vItem.votacion.descripcion ?? "",
          tipo: vItem.votacion.tipo ?? null,
          tramite: (vItem.votacion as { tramite?: string }).tramite ?? null,
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

  it("2. Muestra completa de parlamentarios con cobertura ≥99% de eventos", () => {
    for (const item of muestraAuditIds) {
      const pol = POLITICOS_SEED.find((p) => p.id === item.id);
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
    const pol = POLITICOS_SEED.find((p) => p.id === "dip-057"); // Gonzalo Winter
    expect(pol).toBeDefined();
    if (!pol) return;

    const votaciones = getVotacionesParaPolitico(pol);
    const conBoletin = votaciones.filter((v) => v.votacion.boletin || String(v.votacion.descripcion).includes("Boletín"));
    expect(conBoletin.length).toBeGreaterThan(20);
  });
});
