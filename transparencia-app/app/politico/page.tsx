import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactElement } from "react";
import { PARTIDOS_SEED, POLITICOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import { getEvidenceForPolitico, normalizeSearchText } from "@/lib/data-source";
import { FUENTE_REMUNERACIONES, mesRemuneraciones, remuneracionParaPolitico } from "@/lib/remuneraciones";
import { getGastosAgregadosD1 } from "@/lib/db";
import { comparePorApellido } from "@/lib/format";
import { getPartidoConfig } from "@/lib/partidos.config";
import PoliticosListClient, { type PoliticoCardData } from "@/components/PoliticosListClient";

const DIETA_OFICIAL_PARLAMENTARIA = {
  Diputado: 8291039,
  Senador: 8291039,
  fuente_url: "https://www.senado.cl/transparencia/dietas",
  fuente_nombre: "Senado / Cámara / art. 38 bis Constitución",
  fecha_actualizacion: "Marzo 2026",
};

export const metadata: Metadata = {
  title: "Diputados y Senadores 2026-2030",
  description:
    "Listado completo de los 155 diputados y 50 senadores del período 2026-2030 con acceso a la ficha de transparencia de cada uno.",
};

export const dynamic = "force-static";

export default async function PoliticoDirectory() {
  const rawQuery = "";
  const query = "";
  const cargoFilter = undefined;

  const filtrados = POLITICOS_SEED.filter((politico) => {
    if (cargoFilter && politico.cargo !== cargoFilter) return false;
    if (!query) return true;
    const partido = PARTIDOS_SEED.find((p) => p.id === politico.partido_id);
    return [
      politico.nombre_completo,
      politico.cargo,
      politico.distrito_region,
      politico.numero_distrito ? `distrito ${politico.numero_distrito}` : "",
      partido?.nombre ?? "",
      partido?.sigla ?? "",
    ]
      .filter(Boolean)
      .some((value) => normalizeSearchText(value).includes(query));
  });

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);

  const gastosAgregados = await getGastosAgregadosD1();

  const rankingDiputados = POLITICOS_SEED.filter((p) => p.cargo === "Diputado")
    .map((politico) => {
      const agregado = gastosAgregados[politico.id];
      return { politico, total: agregado?.total_mensual ?? 0, n: 0, ultimo_mes: agregado?.ultimo_mes };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const rankingSenadores = POLITICOS_SEED.filter((p) => p.cargo === "Senador")
    .map((politico) => {
      const agregado = gastosAgregados[politico.id];
      return { politico, total: agregado?.total_mensual ?? 0, n: 0, ultimo_mes: agregado?.ultimo_mes };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const corteCamara = rankingDiputados[0]?.ultimo_mes ?? null;
  const corteSenado = rankingSenadores[0]?.ultimo_mes ?? null;

  interface RankingFila {
    politico: (typeof POLITICOS_SEED)[number];
    total: number;
    n: number;
    ultimo_mes?: string;
  }

  function renderRanking(filas: RankingFila[], esSenado: boolean): ReactElement {
    return (
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Parlamentario</th>
              <th>Cargo / Distrito</th>
              <th>Gasto personal de apoyo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ politico, total, n, ultimo_mes }, index) => {
              const partido = PARTIDOS_SEED.find((p) => p.id === politico.partido_id);
              const slug = getPoliticoSlug(politico);
              return (
                <tr key={politico.id} style={{ position: "relative" }} className="hover-row">
                  <td>
                    <Link href={`/politico/${slug}`} style={{ position: "absolute", inset: 0, zIndex: 1 }} aria-label={`Ficha de ${politico.nombre_completo}`} />
                    <span className="rank-number">{index + 1}</span>
                  </td>
                  <td>
                    <div className="politico-dir__identidad">
                      <div className="avatar">
                        <Image
                          src={politico.foto_url || "/default-avatar.png"}
                          alt={politico.nombre_completo}
                          width={36}
                          height={36}
                          className="rounded-full"
                        />
                      </div>
                      <span>
                        <strong>{politico.nombre_completo}</strong>
                        <small>{partido?.nombre ?? politico.partido_id}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {politico.cargo}
                    {politico.numero_distrito ? <small> · Distrito {politico.numero_distrito}</small> : null}
                  </td>
                  <td>
                    <span title={esSenado ? `Acumulado 2026 (hasta ${ultimo_mes ?? "…"}) · ${n} registros` : `Nómina mensual (${corteCamara ?? "mes publicado"}) · ${n} personas en el equipo`}>
                      {formatCLP(total)}
                    </span>
                    <small>
                      {esSenado ? `acumulado hasta ${ultimo_mes ?? ""}` : `mensual · ${corteCamara ?? "mes publicado"}`}
                      {` · ${n} ${esSenado ? "registros" : "personas"}`}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const tarjetas: PoliticoCardData[] = (await Promise.all(filtrados.map(async (politico) => {
    const partido = PARTIDOS_SEED.find((p) => p.id === politico.partido_id);
    const evidenciasList = await getEvidenceForPolitico(politico);
    const fuentes = evidenciasList.filter((e) => e.records.length > 0).length;
    const sueldo = await remuneracionParaPolitico(politico.nombre_completo);
    const partidoConfig = getPartidoConfig(politico.partido_id || partido?.sigla || "IND");
    const dietaMonto = DIETA_OFICIAL_PARLAMENTARIA[politico.cargo as "Diputado" | "Senador"];
    const verifiedPhoto = politico.foto_url?.startsWith("https://upload.wikimedia.org/")
      ? politico.foto_url
      : null;
    const initials = politico.nombre_completo
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");

    return {
      politico,
      partido,
      fuentes,
      sueldo,
      partidoConfig,
      dietaMonto,
      verifiedPhoto,
      initials,
    };
  }))).sort((a, b) => comparePorApellido(a.politico.nombre_completo, b.politico.nombre_completo));

  const diputados = tarjetas.filter(({ politico }) => politico.cargo === "Diputado");
  const senadores = tarjetas.filter(({ politico }) => politico.cargo === "Senador");

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Nómina parlamentaria</p>
            <h1>Diputados y Senadores 2026-2030</h1>
            <p>
              Listado completo con ficha de transparencia: evidencia pública, votaciones,
              gastos operacionales (Senado) y vínculos documentados. Cada ficha cita su fuente.
            </p>
          </div>
          <form className="cross-search" role="search" action="/politico">
            <label htmlFor="politico-query">Nombre, partido, distrito o región</label>
            <div>
              <input id="politico-query" name="q" type="search" defaultValue={rawQuery} placeholder="Ej.: Kaiser, Araucanía o RN" />
              <button className="btn btn-primary">Buscar</button>
            </div>
          </form>
        </div>
      </section>

      <div className="container-main page-layout">
        <div className="politico-filters" role="group" aria-label="Filtrar por cámara">
          <Link className="btn btn-ghost" href="/politico" aria-current={!cargoFilter ? "page" : undefined}>
            Todos ({POLITICOS_SEED.length})
          </Link>
          <Link className="btn btn-ghost" href="/politico?cargo=Diputado" aria-current={cargoFilter === "Diputado" ? "page" : undefined}>
            Cámara ({POLITICOS_SEED.filter((p) => p.cargo === "Diputado").length})
          </Link>
          <Link className="btn btn-ghost" href="/politico?cargo=Senador" aria-current={cargoFilter === "Senador" ? "page" : undefined}>
            Senado ({POLITICOS_SEED.filter((p) => p.cargo === "Senador").length})
          </Link>
        </div>

        {rawQuery && (
          <p className="relation-disclaimer">
            <strong>{filtrados.length} coincidencia{filtrados.length === 1 ? "" : "s"}</strong> para “{rawQuery}” ·
            buscamos por nombre, cámara, partido, distrito y región.
          </p>
        )}

        {senadores.length > 0 && (
          <PoliticosListClient
            items={senadores}
            title="Senadores"
            eyebrow="Cámara Alta"
            pageSize={20}
          />
        )}

        {diputados.length > 0 && (
          <PoliticosListClient
            items={diputados}
            title="Diputados"
            eyebrow="Cámara Baja"
            pageSize={20}
          />
        )}


        {!rawQuery && (rankingDiputados.length > 0 || rankingSenadores.length > 0) && (
          <details className="ranking-disclosure">
            <summary>Ver ranking de equipos de apoyo parlamentario</summary>
            <section aria-labelledby="ranking-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Datos oficiales de personal de apoyo</p>
                  <h2 id="ranking-title">Ranking de equipos de apoyo parlamentario</h2>
                </div>
              </div>
              <p>
                Gasto mensual de la asignación para personal de apoyo según la nómina oficial de la
                Cámara ({corteCamara ?? "mes publicado por la fuente"}) y registros acumulados del Senado
                ({corteSenado ? `hasta ${corteSenado}` : "períodos publicados"}).
              </p>
              <div className="ranking-disclosure__grid">
                <div>
                  <h3>Top 10 diputados por gasto mensual</h3>
                  {renderRanking(rankingDiputados, false)}
                </div>
                <div>
                  <h3>Top 5 senadores acumulado 2026</h3>
                  {renderRanking(rankingSenadores, true)}
                </div>
              </div>
            </section>
          </details>
        )}

        {filtrados.length === 0 && (
          <div className="empty-state">
            <strong>Sin coincidencias para “{rawQuery}”</strong>
            <p>
              Puede ser un parlamentario fuera del período 2026-2030, una persona de otra institución
              o un dato que aún no publicamos. Probá con apellido, partido o región.
            </p>
            <Link className="btn btn-primary" href="/politico">Ver listado completo</Link>
          </div>
        )}

        <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginTop: "1.5rem" }}>
          *Remuneración bruta mensual según el Registro Público de la Comisión para la Fijación de Remuneraciones
          (art. 38 bis de la Constitución, {mesRemuneraciones() ?? "mayo 2026"}). No incluye asignaciones parlamentarias.
          {" "}<a href={FUENTE_REMUNERACIONES.url} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a>
        </p>
      </div>
    </main>
  );
}
