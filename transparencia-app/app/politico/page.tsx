import type { Metadata } from "next";
import { Suspense } from "react";
import { PARTIDOS_SEED, POLITICOS_SEED } from "@/lib/seed-politicos";
import { getEvidenceForPolitico, getGastosParaPolitico } from "@/lib/data-source";
import { procesarGastosPolitico } from "@/lib/gastos-operacionales";
import { FUENTE_REMUNERACIONES, remuneracionParaPolitico } from "@/lib/remuneraciones";
import { comparePorApellido } from "@/lib/format";
import { getPartidoConfig } from "@/lib/partidos.config";
import PoliticosListClient, { type PoliticoCardData } from "@/components/PoliticosListClient";
import CongressDirectoryClient, { CongressSearchForm } from "@/components/CongressDirectoryClient";

export const metadata: Metadata = {
  title: "Cámara y Senado | El Cambiómetro",
  description: "Elige Diputados o Senado y busca por nombre, partido, distrito o región. Cada ficha conserva sus registros, fuentes y períodos publicados.",
  alternates: { canonical: "/politico" },
};

export default async function PoliticoDirectory() {
  const tarjetas: PoliticoCardData[] = (await Promise.all(POLITICOS_SEED.map(async (politico) => {
    const partido = PARTIDOS_SEED.find((p) => p.id === politico.partido_id);
    const evidenciasList = await getEvidenceForPolitico(politico);
    const gastos = getGastosParaPolitico(politico);
    const gastosProcesados = procesarGastosPolitico(gastos);
    return {
      politico,
      partido,
      fuentes: evidenciasList.filter((e) => e.records.length > 0).length,
      sueldo: await remuneracionParaPolitico(politico.nombre_completo),
      partidoConfig: getPartidoConfig(politico.partido_id || partido?.sigla || "IND"),
      verifiedPhoto: politico.foto_url?.startsWith("https://upload.wikimedia.org/") ? politico.foto_url : null,
      initials: politico.nombre_completo.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""),
      gastosTotal: gastosProcesados.totalAcumulado,
      gastosPeriodos: gastosProcesados.meses.length,
      gastosRegistros: gastos.length,
      gastosUltimoPeriodo: gastosProcesados.ultimoPeriodo || null,
    };
  }))).sort((a, b) => comparePorApellido(a.politico.nombre_completo, b.politico.nombre_completo));
  const diputados = tarjetas.filter(({ politico }) => politico.cargo === "Diputado");
  const senadores = tarjetas.filter(({ politico }) => politico.cargo === "Senador");

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Nómina parlamentaria · 2026–2030</p>
            <h1>Cámara y Senado</h1>
            <p>Elige una cámara y encuentra su ficha parlamentaria: votaciones, dieta, gastos y personal de apoyo, con fuentes y períodos publicados.</p>
          </div>
          <Suspense fallback={
            <form className="cross-search" role="search" action="/politico">
              <label htmlFor="politico-query">Nombre, partido, distrito o región</label>
              <div><input id="politico-query" name="q" type="search" placeholder="Ej.: Kaiser, Araucanía o RN" /><button className="btn btn-primary">Buscar</button></div>
            </form>
          }>
            <CongressSearchForm />
          </Suspense>
        </div>
      </section>
      <div className="container-main page-layout">
        <Suspense fallback={<>
          <PoliticosListClient items={senadores} title="Senadores" eyebrow="Cámara Alta" pageSize={20} />
          <PoliticosListClient items={diputados} title="Diputados" eyebrow="Cámara Baja" pageSize={20} />
        </>}>
          <CongressDirectoryClient items={tarjetas} />
        </Suspense>
        <noscript><p>Activa JavaScript para filtrar por cámara o buscar. Puedes recorrer el listado y abrir las fichas disponibles.</p></noscript>
        <p className="congress-directory__source">
          Remuneración bruta mensual según el Registro Público de la Comisión para la Fijación de Remuneraciones (art. 38 bis).
          Cada ficha indica su mes publicado. No incluye asignaciones parlamentarias.
          {" "}<a href={FUENTE_REMUNERACIONES.url} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a>
        </p>
      </div>
    </main>
  );
}
