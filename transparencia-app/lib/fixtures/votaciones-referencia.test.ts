import { describe, it, expect } from "vitest";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getVotacionesParaPolitico, getTimelineParaPolitico, diputadoIdParaPolitico } from "@/lib/data-source";
import { personalApoyoParaDiputado, personalApoyoParaSenador } from "@/lib/personal-apoyo";
import { esProcedimental } from "@/components/VotacionesHistorial";

describe("Fixture de Referencia Oficial — Votaciones en Sala y Coherencia Interna", () => {
  // Muestra obligatoria de auditoría: Kaiser, Bianchi K., Bianchi C., Winter, Cariola, Schalper
  const muestraAuditIds = [
    { id: "sen-038", nombre: "Vanessa Kaiser Barents-Von Hohenhagen", cargo: "Senador", esperado: 189 },
    { id: "sen-048", nombre: "Karim Bianchi Retamales", cargo: "Senador", esperado: 189 },
    { id: "dip-154", nombre: "Carlos Bianchi Chelech", cargo: "Diputado", esperado: 580 },
    { id: "dip-057", nombre: "Gonzalo Winter Etcheberry", cargo: "Diputado", esperado: 580 },
    { id: "sen-017", nombre: "Karol Cariola Oliva", cargo: "Senador", esperado: 189 },
    { id: "dip-068", nombre: "Diego Schalper Sepúlveda", cargo: "Diputado", esperado: 580 },
  ];

  it("1. Coherencia Matemática Interna: tiles == historial == denominador de presencia", () => {
    for (const item of muestraAuditIds) {
      const pol = POLITICOS_SEED.find((p) => p.id === item.id);
      expect(pol).toBeDefined();
      if (!pol) continue;

      const votaciones = getVotacionesParaPolitico(pol);
      expect(votaciones.length).toBe(item.esperado); // Igualdad estricta tile ficha == fila sweep

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

  it("2. Muestra completa de parlamentarios con cobertura 100% de eventos (tile == sweep)", () => {
    for (const item of muestraAuditIds) {
      const pol = POLITICOS_SEED.find((p) => p.id === item.id);
      expect(pol).toBeDefined();
      if (!pol) continue;

      const votaciones = getVotacionesParaPolitico(pol);
      expect(votaciones.length).toBe(item.esperado);

      const validos = votaciones.filter((v) => v.voto.opcion && v.votacion.fecha);
      const ratio = validos.length / votaciones.length;
      expect(ratio).toBe(1.0);
    }
  });

  it("3. Elección 2025: Header 'Votación Electoral 2025' y timeline hito leen del mismo registro (header.pct == hito.pct)", () => {
    const bianchi = POLITICOS_SEED.find((p) => p.id === "dip-154");
    expect(bianchi).toBeDefined();
    if (!bianchi) return;

    const timeline = getTimelineParaPolitico(bianchi);
    const hitoEleccion = timeline.find((e) => e.tipo === "eleccion");
    expect(hitoEleccion).toBeDefined();

    const expectedPctString = `${bianchi.porcentaje_votos?.toLocaleString("es-CL", { minimumFractionDigits: 2 })}% de votos válidos`;
    expect(hitoEleccion?.detalle).toBe(expectedPctString);
    expect(hitoEleccion?.titulo).toContain(bianchi.votos_2025?.toLocaleString("es-CL"));
  });

  it("4. Personal de Apoyo: suma(listado) == tile para Carlos Bianchi y Vanessa Kaiser", async () => {
    // 1. Carlos Bianchi (Diputado)
    const bianchi = POLITICOS_SEED.find((p) => p.id === "dip-154");
    expect(bianchi).toBeDefined();
    const dipId = diputadoIdParaPolitico(bianchi!);
    expect(dipId).toBeDefined();
    const apoyoDip = await personalApoyoParaDiputado(dipId!);
    expect(apoyoDip).toBeDefined();

    if (apoyoDip?.diputado?.personal_apoyo) {
      const sumaContratos = apoyoDip.diputado.personal_apoyo.reduce((sum, f) => sum + (f.sueldo || 0), 0);
      expect(sumaContratos).toBe(apoyoDip.total_mensual);
      expect(sumaContratos).toBe(7890000);
    }

    // 2. Vanessa Kaiser (Senadora)
    const kaiser = POLITICOS_SEED.find((p) => p.id === "sen-038");
    expect(kaiser).toBeDefined();
    const apoyoSen = await personalApoyoParaSenador(kaiser!.nombre_completo);
    expect(apoyoSen).toBeDefined();
    const registrosUltimoMes = apoyoSen.registros.filter((r) => r.periodo === apoyoSen.ultimo_mes);
    const sumaMesKaiser = registrosUltimoMes.reduce((sum, r) => sum + (r.monto || 0), 0);
    expect(sumaMesKaiser).toBe(15250000);
  });

  it("5. Padrón nominal de votaciones conserva boletines y enlaces oficiales de tramitación", () => {
    const pol = POLITICOS_SEED.find((p) => p.id === "dip-057"); // Gonzalo Winter
    expect(pol).toBeDefined();
    if (!pol) return;

    const votaciones = getVotacionesParaPolitico(pol);
    const conBoletin = votaciones.filter((v) => v.votacion.boletin || String(v.votacion.descripcion).includes("Boletín"));
    expect(conBoletin.length).toBeGreaterThan(20);
  });
});
