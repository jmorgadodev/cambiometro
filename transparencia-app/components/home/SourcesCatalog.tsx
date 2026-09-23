"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck, Database } from "./Icons";

interface SourceLedgerItem {
  id: string;
  code: string;
  name: string;
  org: string;
  scope: string;
  recordsCount: string;
  frequency: string;
  verificationStatus: string;
  link: string;
}

export interface PillarChapter {
  id: string;
  romanNumeral: string;
  title: string;
  shortLabel: string;
  question: string;
  totalRecords: string;
  sourcesCount: number;
  sources: SourceLedgerItem[];
}

export interface SourcesCatalogProps {
  chapters: PillarChapter[];
  totalSources: number;
  totalRecords: number;
  dataUpdatedAt?: string | null;
}

export function SourcesCatalog({
  chapters,
  totalSources,
  totalRecords,
  dataUpdatedAt,
}: SourcesCatalogProps) {
  const [activeChapterId, setActiveChapterId] = useState<string>("dinero");
  const activeChapter = chapters.find((c) => c.id === activeChapterId) || chapters[0];
  if (!activeChapter) return null;

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 bg-background text-text-1 border-b border-border transition-colors duration-200">
      {/* Sutil Retícula Milimétrica Documental */}
      <div className="absolute inset-0 bg-grid-documental mask-radial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── CABECERA EDITORIAL Y MANIFIESTO ── */}
        <div className="mb-8 sm:mb-10 pb-6 border-b border-border">
          <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-accent uppercase mb-2">
            INFRAESTRUCTURA DE DATOS PÚBLICOS
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-text-1 tracking-tight leading-tight">
                {totalSources} fuentes canónicas bajo un estándar documental único
              </h2>
              <p className="text-sm sm:text-[15px] text-text-2 max-w-2xl leading-relaxed mt-1">
                Registros publicados por distintas fuentes del Estado, cada una con su propio alcance, período y procedencia.
              </p>
            </div>

            {/* Conteos públicos del catálogo */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 text-xs font-mono text-text-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-border">
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-sm text-text-1 tabular-nums">
                  {totalRecords.toLocaleString("es-CL")}
                </span>
                <span className="text-[10px] uppercase">Registros</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-sm text-accent tabular-nums">
                  {totalSources}
                </span>
                <span className="text-[10px] uppercase">Fuentes</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SELECTOR DE CAPÍTULOS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-8">
          {chapters.map((chapter) => {
            const isActive = chapter.id === activeChapterId;
            return (
              <button
                key={chapter.id}
                onClick={() => setActiveChapterId(chapter.id)}
                className={`text-left p-4 sm:p-5 border transition-all duration-150 relative cursor-pointer group select-none rounded-sm ${
                  isActive
                    ? "bg-forest-bg border-forest-border text-white shadow-md"
                    : "bg-surface-2 border-border hover:bg-surface"
                }`}
              >
                {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-forest-accent-ok" />}

                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold tracking-widest uppercase ${
                      isActive ? "text-forest-accent" : "text-text-3"
                    }`}
                  >
                    CAPÍTULO {chapter.romanNumeral}
                  </span>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      isActive ? "text-forest-subtle" : "text-text-3"
                    }`}
                  >
                    {chapter.sourcesCount} fuentes
                  </span>
                </div>

                <div
                  className={`font-serif text-sm sm:text-base font-bold leading-snug line-clamp-1 ${
                    isActive
                      ? "text-forest-text"
                      : "text-text-2 group-hover:text-text-1"
                  }`}
                >
                  {chapter.shortLabel}
                </div>

                <div
                  className={`mt-2 text-[11px] font-mono tabular-nums ${
                    isActive ? "text-forest-subtle" : "text-text-3"
                  }`}
                >
                  {chapter.totalRecords}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── ENCABEZADO DEL CAPÍTULO ACTIVO ── */}
        <div className="p-4 sm:p-6 bg-surface-2 border-t-2 border-b border-accent border-b-border mb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase">
              CAPÍTULO {activeChapter.romanNumeral} · {activeChapter.title.toUpperCase()}
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-text-1 mt-0.5">
              “{activeChapter.question}”
            </h3>
          </div>
          <div className="text-xs font-mono text-text-3 sm:text-right shrink-0">
            <span className="font-semibold text-text-1">
              {activeChapter.sourcesCount} fuentes integradas
            </span>
            <span className="block text-[10px]">{activeChapter.totalRecords}</span>
          </div>
        </div>

        {/* ── EL GRAN LIBRO MAYOR (LEDGER DE AUDITORÍA) ── */}
        <div className="border-x border-b border-border divide-y divide-border bg-surface">
          {/* Cabecera de columnas en Desktop */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 bg-surface-2 text-[10px] font-mono font-bold uppercase tracking-wider text-text-3 border-b border-border">
            <div className="col-span-4">CÓDIGO & FUENTE OFICIAL</div>
            <div className="col-span-4">QUÉ PERMITE FISCALIZAR</div>
            <div className="col-span-2 text-right">VOLUMEN & FRECUENCIA</div>
            <div className="col-span-2 text-right">INTEGRIDAD & ACCESO</div>
          </div>

          {/* Filas del Ledger */}
          {activeChapter.sources.map((source, idx) => (
            <article
              key={source.id}
              style={{
                animation: `editorialHeadlineFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 90}ms both`,
              }}
              className="p-5 sm:p-6 lg:px-6 lg:py-5 hover:bg-surface-2 transition-colors duration-150 group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-4 items-start lg:items-center">
                {/* 1. Código & Nombre de la Fuente */}
                <div className="lg:col-span-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent bg-ok-bg px-2 py-0.5 border border-accent/20">
                      {source.code}
                    </span>
                    <span className="text-[10px] font-mono text-text-3 truncate">
                      {source.org}
                    </span>
                  </div>
                  <h4 className="font-serif text-base sm:text-lg font-bold text-text-1 leading-snug group-hover:text-accent transition-colors">
                    {source.name}
                  </h4>
                </div>

                {/* 2. Qué permite fiscalizar */}
                <div className="lg:col-span-4">
                  <p className="text-xs sm:text-[13px] text-text-2 leading-relaxed">
                    {source.scope}
                  </p>
                </div>

                {/* 3. Volumen & Frecuencia */}
                <div className="lg:col-span-2 flex lg:flex-col justify-between lg:justify-center items-center lg:items-end border-t lg:border-t-0 pt-2 lg:pt-0 border-border/60">
                  <div className="font-serif text-lg sm:text-xl font-bold text-text-1 tabular-nums leading-none">
                    {source.recordsCount}
                  </div>
                  <div className="text-[10px] font-mono text-text-3 mt-0.5">
                    {source.frequency}
                  </div>
                </div>

                {/* 4. Integridad Documental & Enlace */}
                <div className="lg:col-span-2 flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                  <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-accent">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{source.verificationStatus}</span>
                  </div>
                  <Link
                    href={source.link}
                    prefetch={false}
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-accent hover:underline group/btn shrink-0"
                  >
                    <span>Auditar</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* ── PIE DE AUDITORÍA Y METODOLOGÍA ── */}
        <div className="mt-8 p-4 sm:p-5 bg-surface-2 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-text-2">
            <Database className="w-4 h-4 text-accent shrink-0" />
            <span>
              <strong>Trazabilidad metodológica:</strong> Los conteos corresponden a cada fuente; pueden incluir períodos y categorías diferentes y no se suman como personas únicas.
              {dataUpdatedAt && ` Catálogo actualizado el ${dataUpdatedAt}.`}
            </span>
          </div>
          <Link
            href="/como-funciona"
            prefetch={false}
            className="inline-flex items-center gap-1 text-accent font-mono font-bold hover:underline shrink-0"
          >
            <span>Ver auditoría completa y esquemas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default SourcesCatalog;
