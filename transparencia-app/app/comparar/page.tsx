import type { Metadata } from "next";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getVotacionesParaPolitico, getGastosParaPolitico } from "@/lib/data-source";
import { personalApoyoParaDiputado } from "@/lib/personal-apoyo";
import { diputadoIdParaPolitico } from "@/lib/data-source";
import CompararClient from "./comparar-client";

export const metadata: Metadata = {
  title: "Comparar Representantes — El Cambiómetro",
  description:
    "Compara lado a lado los votaciones, gastos operacionales y equipo de apoyo de dos parlamentarios con datos reales del Congreso.",
};

export default async function CompararPage() {
  // Pre-calcular datos de todos los políticos en el servidor (acceso a FS)
  const politicosConDatos = await Promise.all(POLITICOS_SEED.map(async (pol) => {
    const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);
    const votaciones = getVotacionesParaPolitico(pol);
    const gastos = getGastosParaPolitico(pol);
    const apoyo = await personalApoyoParaDiputado(diputadoIdParaPolitico(pol));

    // Resumen de votaciones
    const votosSi = votaciones.filter((v) => v.voto.opcion_valor === "SI").length;
    const votosNo = votaciones.filter((v) => v.voto.opcion_valor === "NO").length;
    const votosAbst = votaciones.filter((v) => v.voto.opcion_valor === "ABSTENCION").length;
    const votosNoVota = votaciones.filter((v) => v.voto.opcion_valor === "DISPENSADO" || v.voto.opcion_valor === "NO_VOTA").length;
    const totalVotaciones = votaciones.length;

    // Gasto operacional total rendido
    const gastoTotal = gastos.reduce((s, g) => s + (g.monto_clp ?? 0), 0);
    const ultimoMesGasto = gastos[0]?.fecha ?? null;

    // Equipo de apoyo
    const apoyoTotal = apoyo?.total_mensual ?? 0;
    const apoyoN = apoyo?.n_personas ?? 0;
    const apoyoMes = apoyo?.diputado?.mes_personal ?? null;

    return {
      id: pol.id,
      nombre_completo: pol.nombre_completo,
      cargo: pol.cargo,
      foto_url: pol.foto_url ?? "",
      distrito_region: pol.distrito_region,
      votos_2025: pol.votos_2025 ?? null,
      partido_sigla: partido?.sigla ?? pol.partido_id,
      partido_color: partido?.color_hex ?? "var(--accent)",
      // Votaciones
      votosSi,
      votosNo,
      votosAbst,
      votosNoVota,
      totalVotaciones,
      pctAsistencia: totalVotaciones > 0 ? Math.round(((votosSi + votosNo + votosAbst) / totalVotaciones) * 100) : null,
      pctSi: totalVotaciones > 0 ? Math.round((votosSi / totalVotaciones) * 100) : null,
      // Gastos
      gastoTotal,
      ultimoMesGasto,
      // Equipo de apoyo
      apoyoTotal,
      apoyoN,
      apoyoMes,
    };
  }));

  return <CompararClient politicos={politicosConDatos} />;
}
