"use client";
import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "./Icons";

// Bespoke Civic Category Iconography (Unique, journalistic)
const LegislativeVoteIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="9" width="18" height="13" rx="2" />
    <path d="M7 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <path d="M10 7l2 2 3-3" />
  </svg>
);

const FiscalTransferIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V10" />
    <path d="M19 21V10" />
    <path d="M2 10l10-7 10 7" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M12 11.5v-1m0 7v-1" />
  </svg>
);

const MunicipalTerritoryIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 19 8 19 18 12 22 5 18 5 8 12 2" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="12" y1="2" x2="12" y2="9.5" />
    <line x1="12" y1="14.5" x2="12" y2="22" />
  </svg>
);

const EntityNetworkIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
    <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
    <line x1="16.5" y1="8.5" x2="13.5" y2="15.5" />
    <circle cx="12" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

const PublicAuthorityIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <circle cx="12" cy="10" r="2.5" />
    <path d="M8 17a4 4 0 0 1 8 0" />
    <line x1="10" y1="1" x2="14" y2="1" />
    <line x1="12" y1="1" x2="12" y2="4" />
  </svg>
);

export interface QuestionsGridProps {
  availableSourceCount: number;
}

export function QuestionsGrid({ availableSourceCount }: QuestionsGridProps) {
  const hasEntered = true;

  return (
    <section className="py-14 sm:py-18 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-border">
          <div>
            <div className="text-xs font-mono font-bold tracking-widest text-text-3 uppercase">
              MESA DE ANÁLISIS CÍVICO
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-text-1 font-bold mt-1">
              Empieza por una pregunta
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-text-2 max-w-md mt-2 md:mt-0">
            Convertimos registros dispersos del Estado en respuestas comprensibles respaldadas por el documento oficial.
          </p>
        </div>

        {/* Asymmetric Content Layout with Equal Height Stretch */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* ── LEFT COLUMN: PIEZA EDITORIAL FULL-HEIGHT ── */}
          <div className="lg:col-span-5 relative flex flex-col justify-between h-full min-h-[580px] lg:min-h-0 rounded-2xl overflow-hidden shadow-xl border border-border bg-surface group">
            {/* Luminous Vertical Documentary Photograph */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="/assets/investigacion-mesa-luz.jpg"
                alt="Mesa de investigación y auditoría pública con documentos oficiales en Santiago de Chile"
                className="w-full h-full object-cover object-[center_30%] filter brightness-[0.98] contrast-[1.04] transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black via-black/80 via-40% to-transparent pointer-events-none" />
            </div>

            {/* Top Archival Docket Header */}
            <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-mono font-medium text-white shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="tracking-wider">MESA DE AUDITORÍA</span>
                <span className="text-white/40">•</span>
                <span className="text-white/80">SANTIAGO</span>
              </div>
              <span className="text-[10px] font-mono text-white/80 uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-sm">
                Evidencia Canónica
              </span>
            </div>

            {/* Bottom Integrated Editorial Typography Plate */}
            <div className="relative z-10 w-full p-6 sm:p-8 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-[2px] border-t border-white/10 flex flex-col items-center text-center">
              {/* Category Pill */}
              <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/40 font-bold mb-3 shadow-sm backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>AUDITORÍA CIUDADANA</span>
              </div>

              {/* Major Editorial Headline */}
              <h3 className="font-serif text-2xl sm:text-3xl lg:text-[28px] font-bold text-white leading-tight tracking-tight mb-2.5 drop-shadow-sm">
                Datos que cuentan historias reales
              </h3>

              {/* Narrative Lead Paragraph */}
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-sm mx-auto mb-4 font-normal drop-shadow-sm">
                Ninguna cifra es abstracta: cada peso asignado, voto de sala o licitación responde a un acto público verificable en su fuente.
              </p>

              {/* Action Bar */}
              <div className="w-full pt-3.5 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-2">
                <Link
                  href="/datos"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-mono font-bold text-accent hover:opacity-90 transition-colors group/link mx-auto sm:mx-0"
                >
                  <span>Revisar fuentes y procedencia</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                </Link>
                <span className="text-[10px] font-mono text-white/50 tracking-wider uppercase">
                  {availableSourceCount} FUENTES OFICIALES
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: TARJETAS CENTRADAS ── */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4 h-full">
            {/* 1. Lead Dossier: ¿Cómo votó una autoridad? */}
            <Link
              href="/politico"
              prefetch={false}
              style={{
                opacity: hasEntered ? 1 : 0,
                transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                transition: "all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.12s",
              }}
              className="p-6 sm:p-7 rounded-2xl bg-surface border border-border hover:border-accent shadow-sm hover:shadow-editorial transition-all duration-200 group flex flex-col items-center text-center"
            >
              {/* Category Pill with Bespoke Icon Centered */}
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-ok-bg text-xs font-mono font-bold text-accent uppercase mb-2">
                <LegislativeVoteIcon className="w-4 h-4" />
                <span>PODER & DECISIÓN</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-text-1 group-hover:text-accent transition-colors leading-snug">
                ¿Cómo votó una autoridad?
              </h3>

              <p className="text-xs sm:text-sm text-text-2 mt-2 leading-relaxed max-w-xl mx-auto">
                Consulta en una sola ficha consolidada las votaciones de sala, porcentaje de asistencia, dietas, gastos operacionales rendidos, nómina de asesores y declaraciones de patrimonio.
              </p>

              {/* Centered Tag Pills */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-0.5 rounded-full bg-surface-2 text-accent border border-border">
                  Votaciones y Sala
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-2 text-accent border border-border">
                  Dietas y Gastos
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-2 text-accent border border-border">
                  Asesores y Vínculos
                </span>
              </div>

              {/* Centered Action Link */}
              <div className="mt-4 inline-flex items-center justify-center gap-1.5 text-xs font-mono font-semibold text-accent group-hover:underline">
                <span>Explorar ficha parlamentaria</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </Link>

            {/* 2. The 4 Companion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: Dinero Público / Transferencias */}
              <Link
                href="/transferencias"
                prefetch={false}
                style={{
                  opacity: hasEntered ? 1 : 0,
                  transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.22s",
                }}
                className="card-hover-editorial p-5 sm:p-6 rounded-xl bg-surface border border-border hover:border-accent shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-ok-bg flex items-center justify-center text-accent mb-2.5 transition-transform duration-300 group-hover:scale-110">
                  <FiscalTransferIcon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
                  DINERO PÚBLICO
                </div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-text-1 mt-1 group-hover:text-accent transition-colors leading-snug">
                  ¿A quién transfiere el Estado?
                </h4>
                <p className="text-[12px] text-text-2 mt-1.5 leading-snug max-w-[240px]">
                  Transferencias Ley 19.862: emisor, fundación receptora y montos.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent group-hover:underline">
                  <span>Explorar</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>

              {/* Card 2: Territorio Comunal / 346 Municipios */}
              <Link
                href="/municipalidades"
                prefetch={false}
                style={{
                  opacity: hasEntered ? 1 : 0,
                  transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.32s",
                }}
                className="card-hover-editorial p-5 sm:p-6 rounded-xl bg-surface border border-border hover:border-accent shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-ok-bg flex items-center justify-center text-accent mb-2.5 transition-transform duration-300 group-hover:scale-110">
                  <MunicipalTerritoryIcon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
                  TERRITORIO COMUNAL
                </div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-text-1 mt-1 group-hover:text-accent transition-colors leading-snug">
                  ¿Cómo se gobiernan 346 comunas?
                </h4>
                <p className="text-[12px] text-text-2 mt-1.5 leading-snug max-w-[240px]">
                  Censo 2024, finanzas locales, alcaldías y compras públicas.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent group-hover:underline">
                  <span>Explorar</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>

              {/* Card 3: Redes y Relaciones / Cruces Documentales */}
              <Link
                href="/cruces"
                prefetch={false}
                style={{
                  opacity: hasEntered ? 1 : 0,
                  transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.42s",
                }}
                className="card-hover-editorial p-5 sm:p-6 rounded-xl bg-surface border border-border hover:border-accent shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-ok-bg flex items-center justify-center text-accent mb-2.5 transition-transform duration-300 group-hover:scale-110">
                  <EntityNetworkIcon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
                  REDES Y RELACIONES
                </div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-text-1 mt-1 group-hover:text-accent transition-colors leading-snug">
                  ¿Qué entidades están conectadas?
                </h4>
                <p className="text-[12px] text-text-2 mt-1.5 leading-snug max-w-[240px]">
                  Relaciones documentales, cruces de contratos y vínculos.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent group-hover:underline">
                  <span>Explorar</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>

              {/* Card 4: Directorio Público / Personas */}
              <Link
                href="/personas"
                prefetch={false}
                style={{
                  opacity: hasEntered ? 1 : 0,
                  transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                  transition: "all 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.52s",
                }}
                className="card-hover-editorial p-5 sm:p-6 rounded-xl bg-surface border border-border hover:border-accent shadow-sm transition-all group flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-ok-bg flex items-center justify-center text-accent mb-2.5 transition-transform duration-300 group-hover:scale-110">
                  <PublicAuthorityIcon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
                  DIRECTORIO PÚBLICO
                </div>
                <h4 className="font-serif text-base sm:text-lg font-bold text-text-1 mt-1 group-hover:text-accent transition-colors leading-snug">
                  ¿Quiénes ocupan cargos públicos?
                </h4>
                <p className="text-[12px] text-text-2 mt-1.5 leading-snug max-w-[240px]">
                  Autoridades, seremis, directores y nóminas oficiales.
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-accent group-hover:underline">
                  <span>Explorar</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default QuestionsGrid;
