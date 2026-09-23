"use client";
import React, { useState } from "react";
import Link from "next/link";

export interface FeaturedVoteItem {
  id: string;
  camara: string;
  fecha: string;
  boletin: string;
  etapa: string;
  dilemaCivico: string;
  titulo: string;
  impactoCiudadano: string;
  veredicto: string;
  veredictoTipo: "aprobado" | "rechazado";
  quorumExplicado: string;
  votosFavor: number;
  votosContra: number;
  votosAbstencion: number;
  alineacionPolitica?: string;
  hasNominalVotes: boolean;
  link: string;
}

export interface FeaturedVotesProps {
  votes: FeaturedVoteItem[];
  reviewedAt?: string | null;
  latestVoteDate?: string | null;
}

export function FeaturedVotes({
  votes,
  reviewedAt,
  latestVoteDate,
}: FeaturedVotesProps) {
  const [hoveredVoteId, setHoveredVoteId] = useState<string | null>(null);
  const hasEntered = true;

  const displayVotes = votes;

  return (
    <section
      className="relative overflow-hidden py-16 sm:py-20 bg-background text-text-1 border-b border-border transition-colors duration-200"
      aria-labelledby="home-featured-votes-title"
    >
      <div className="absolute inset-0 bg-grid-documental mask-radial-fade pointer-events-none opacity-40" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── CABECERA EDITORIAL ── */}
        <div className="mb-8 sm:mb-10 pb-6 border-b border-border">
          <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-accent uppercase mb-2">
            SEGUIMIENTO LEGISLATIVO
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 id="home-featured-votes-title" className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-text-1 tracking-tight leading-tight">
                Votaciones destacadas en el Congreso
              </h2>
              <p className="text-sm sm:text-[15px] text-text-2 max-w-2xl leading-relaxed mt-1">
                La evidencia de cómo votaron las bancadas en las leyes que reconfiguran el poder, los recursos públicos y los derechos ciudadanos.
              </p>
            </div>
            <Link
              href="/votaciones-destacadas"
              prefetch={false}
              className="text-xs sm:text-sm font-mono font-bold text-accent hover:underline flex items-center gap-1.5 group shrink-0"
            >
              <span>Ver listado completo de votaciones</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          {(reviewedAt || latestVoteDate) && (
            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs font-mono text-text-3">
              {reviewedAt && (
                <span>Última revisión: <strong className="text-text-1">{reviewedAt}</strong></span>
              )}
              {latestVoteDate && (
                <span>Última votación de sala: <strong className="text-text-1">{latestVoteDate}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* ── FICHAS DE HEMICICLO ── */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-y border-border"
          onMouseLeave={() => setHoveredVoteId(null)}
        >
          {displayVotes.length === 0 && <p className="text-sm text-text-2">No hay votaciones destacadas publicadas en este corte.</p>}
          {displayVotes.slice(0, 3).map((vote, idx) => {
            const isLead = idx === 1; // La central es el ancla verde bosque
            const isHovered = hoveredVoteId === vote.id;
            const isOtherHovered = hoveredVoteId !== null && !isHovered;

            return (
              <article
                key={vote.id}
                onMouseEnter={() => setHoveredVoteId(vote.id)}
                className={`relative p-5 sm:p-6 md:p-8 flex flex-col justify-between transition-all duration-300 ease-out select-none ${
                  isOtherHovered ? "md:opacity-65 md:scale-[0.995]" : "opacity-100"
                } ${
                  isLead
                    ? "bg-forest-bg text-white z-10 rounded-xl md:rounded-xl shadow-md " +
                      (isHovered ? "shadow-2xl md:-translate-y-1.5 ring-1 ring-forest-accent/60" : "md:-translate-y-0.5")
                    : isHovered
                      ? "bg-surface shadow-xl md:-translate-y-1.5 z-20 rounded-xl md:rounded-xl ring-1 ring-accent/40"
                      : "bg-transparent text-text-1"
                }`}
              >
                {/* Retícula sutil en la ficha central verde bosque */}
                {isLead && (
                  <div className="absolute inset-0 bg-grid-dark-documental mask-radial-fade pointer-events-none opacity-40 rounded-xl" aria-hidden="true" />
                )}

                {/* Línea superior esmeralda sutil en hover para fichas sobre papel */}
                {!isLead && isHovered && (
                  <div className="absolute top-0 left-6 right-6 h-[2px] bg-accent rounded-full" />
                )}

                <div className="relative">
                  {/* 1. Dilema Cívico & Metadatos */}
                  <div
                    className={`pb-3 border-b space-y-1.5 transition-colors duration-200 ${
                      isLead ? "border-forest-border" : "border-border/70"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        {isLead && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-forest-card border border-forest-border-subtle text-[9px] font-mono font-bold text-forest-accent-ok uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-forest-accent-ok animate-pulse" />
                            <span>PROYECTO CLAVE</span>
                          </span>
                        )}
                        <span
                          className={`font-bold uppercase tracking-wider transition-colors duration-200 ${
                            isLead ? "text-forest-accent" : "text-accent"
                          }`}
                        >
                          {"// "}{vote.dilemaCivico}
                        </span>
                      </div>
                      <span
                        className={`tracking-wider transition-colors duration-200 ${
                          isLead ? "text-forest-subtle" : "text-text-3"
                        }`}
                      >
                        {vote.fecha}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between text-[10px] font-mono transition-colors duration-200 ${
                        isLead ? "text-forest-subtle" : "text-text-3"
                      }`}
                    >
                      <span>{vote.camara}</span>
                      <span className="opacity-75">{vote.boletin}</span>
                    </div>
                  </div>

                  {/* 2. Titular Periodístico */}
                  <h3
                    className={`font-serif text-xl sm:text-[22px] font-bold mt-4 leading-snug tracking-tight transition-colors duration-200 ${
                      isLead
                        ? "text-forest-text"
                        : isHovered
                          ? "text-accent"
                          : "text-text-1"
                    }`}
                  >
                    {vote.titulo}
                  </h3>

                  {/* 3. Qué cambia en la práctica */}
                  <p
                    className={`text-xs sm:text-sm mt-2.5 leading-relaxed transition-colors duration-200 ${
                      isLead ? "text-forest-subtle" : "text-text-2"
                    }`}
                  >
                    {vote.impactoCiudadano}
                  </p>
                </div>

                {/* 4. Veredicto de Sala & Correlación de Fuerzas */}
                <div
                  className={`relative mt-8 pt-4 border-t transition-colors duration-200 ${
                    isLead ? "border-forest-border" : "border-border/70"
                  }`}
                >
                  {/* Veredicto rotundo */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider ${
                        vote.veredictoTipo === "aprobado"
                          ? isLead ? "text-forest-accent-ok" : "text-accent"
                          : "text-danger"
                      }`}
                    >
                      <span className="text-[9px]" aria-hidden="true">●</span>
                      <span>{vote.veredicto}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono transition-colors duration-200 ${
                        isLead ? "text-forest-subtle" : "text-text-3"
                      }`}
                    >
                      {vote.quorumExplicado}
                    </span>
                  </div>

                  {/* Marcador tipográfico de votos */}
                  <div
                    className={`grid grid-cols-3 text-center py-2.5 font-mono text-xs select-none border transition-all duration-200 ${
                      isLead
                        ? "bg-forest-card/90 border-forest-border-subtle rounded-lg"
                        : isHovered
                          ? "bg-surface border-accent/40 rounded-lg shadow-xs"
                          : "bg-surface-2 border-border"
                    }`}
                  >
                    <div className="px-1">
                      <div
                        className={`text-[10px] uppercase tracking-wider ${
                          isLead ? "text-forest-subtle" : "text-text-3"
                        }`}
                      >
                        A FAVOR
                      </div>
                      <div
                        className={`font-serif text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${
                          isLead ? "text-forest-accent-ok" : "text-accent"
                        }`}
                      >
                        {vote.hasNominalVotes ? `${vote.votosFavor}%` : "—"}
                      </div>
                    </div>
                    <div
                      className={`px-1 border-x ${
                        isLead
                          ? "border-forest-border-subtle"
                          : isHovered
                            ? "border-accent/30"
                            : "border-border"
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase tracking-wider ${
                          isLead ? "text-forest-subtle" : "text-text-3"
                        }`}
                      >
                        EN CONTRA
                      </div>
                      <div className="font-serif text-lg sm:text-xl font-bold text-danger tabular-nums mt-0.5">
                        {vote.hasNominalVotes ? `${vote.votosContra}%` : "—"}
                      </div>
                    </div>
                    <div className="px-1">
                      <div
                        className={`text-[10px] uppercase tracking-wider ${
                          isLead ? "text-forest-subtle" : "text-text-3"
                        }`}
                      >
                        ABST.
                      </div>
                      <div
                        className={`font-serif text-lg sm:text-xl font-bold tabular-nums mt-0.5 ${
                          isLead ? "text-forest-subtle" : "text-text-3"
                        }`}
                      >
                        {vote.hasNominalVotes ? `${vote.votosAbstencion}%` : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Termómetro de sala */}
                  <div
                    className={`w-full h-2 flex mt-3 overflow-hidden rounded-full ${
                      isLead ? "bg-forest-card" : "bg-surface-2 border border-border"
                    }`}
                    aria-hidden="true"
                  >
                    <div
                      style={{
                        width: hasEntered ? `${vote.votosFavor}%` : "0%",
                        transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
                      }}
                      className={isLead ? "bg-forest-accent-ok h-full" : "bg-accent h-full"}
                    />
                    <div
                      style={{
                        width: hasEntered ? `${vote.votosContra}%` : "0%",
                        transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                      }}
                      className="bg-danger h-full"
                    />
                    <div
                      style={{
                        width: hasEntered ? `${vote.votosAbstencion}%` : "0%",
                        transition: "width 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.45s",
                      }}
                      className={isLead ? "bg-forest-subtle h-full" : "bg-text-3 h-full"}
                    />
                  </div>

                  {/* Pulso y alineación de bancadas políticas */}
                  <p
                    className={`text-[11px] font-sans mt-3 leading-relaxed transition-colors duration-200 ${
                      isLead ? "text-forest-subtle" : "text-text-3"
                    }`}
                  >
                    {vote.alineacionPolitica && <span
                      className={`font-semibold ${
                        isLead ? "text-forest-text" : "text-text-1"
                      }`}
                    >
                      Fuerzas:{" "}
                    </span>}
                    {vote.alineacionPolitica}
                  </p>

                  {/* 5. Llamado a la acción cívico */}
                  <div
                    className={`mt-5 pt-3 border-t transition-colors duration-200 ${
                      isLead ? "border-forest-border" : "border-border/70"
                    }`}
                  >
                    <Link
                      href={vote.link}
                      prefetch={false}
                      className={`inline-flex items-center justify-between w-full text-xs font-mono font-bold hover:underline group/cta ${
                        isLead ? "text-forest-accent-ok hover:opacity-90" : "text-accent"
                      }`}
                    >
                      <span>Ver cómo votó cada parlamentario</span>
                      <span className="transition-transform group-hover/cta:translate-x-1">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturedVotes;
