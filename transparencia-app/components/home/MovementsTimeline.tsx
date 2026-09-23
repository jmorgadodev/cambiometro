"use client";
import React from "react";
import Link from "next/link";
import MechanicalCounter from "./MechanicalCounter";

export interface MovementItem {
  id: string;
  refCode: string;
  day: string;
  month: string;
  year: string;
  category: string;
  title: string;
  desc: string;
  source: string;
  status: "VERIFICADO OFICIAL" | "CORROBORADO" | "EN CONFIRMACIÓN";
  link: string;
  dateQualifier?: string;
}

export interface MovementsTimelineProps {
  total: number;
  renuncias: number;
  diasSinCambios: number;
  diasEntreCambios: number;
  desde: string;
  ultimoEvento: string;
  ultimaRevision: string;
  movements: MovementItem[];
}

export function MovementsTimeline({
  total,
  renuncias,
  diasSinCambios,
  diasEntreCambios,
  desde,
  ultimoEvento,
  ultimaRevision,
  movements,
}: MovementsTimelineProps) {
  const leadMovement = movements[0];
  const archiveMovements = movements.slice(1, 3);
  const renderStatus = (status: MovementItem["status"]) => {
    if (status === "VERIFICADO OFICIAL") {
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-text-1 uppercase">
          <span className="text-accent text-[9px]" aria-hidden="true">●</span>
          <span className="font-semibold">VERIFICADO OFICIAL</span>
        </span>
      );
    }
    if (status === "EN CONFIRMACIÓN") {
      return (
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-text-1 uppercase">
          <span className="text-warn text-[9px]" aria-hidden="true">●</span>
          <span className="font-semibold">EN CONFIRMACIÓN</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-text-1 uppercase">
        <span className="text-text-3 text-[9px]" aria-hidden="true">●</span>
        <span className="font-semibold">CORROBORADO</span>
      </span>
    );
  };

  return (
    <section className="py-16 sm:py-20 bg-background text-text-1 border-b border-border transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── 1. CABECERA EDITORIAL ── */}
        <div className="mb-8 sm:mb-10 pb-6 border-b border-border">
          <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-accent uppercase mb-2">
            SEGUIMIENTO DE AUTORIDADES
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-text-1 tracking-tight leading-tight">
              Lo último que cambió en el Estado
            </h2>
            <p className="text-sm sm:text-[15px] text-text-2 max-w-xl leading-relaxed">
              Una lectura cronológica y verificable de movimientos, nombramientos y modificaciones en cargos públicos.
            </p>
          </div>
        </div>

        {/* ── 11. TIMELINE SUTIL CON INICIO, ÚLTIMO CAMBIO Y ÚLTIMA REVISIÓN ── */}
        <div className="mb-12 pb-6 border-b border-border/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
            {/* Inicio */}
            <div className="flex items-center gap-2 text-text-2">
              <span className="text-text-1 font-semibold tracking-wider">{desde}</span>
              <span className="text-[10px] text-text-3 uppercase tracking-widest">— Inicio</span>
            </div>

            {/* Trazo central con ÚLTIMO CAMBIO siempre destacado y legible */}
            <div className="flex-1 flex items-center px-2 sm:px-6">
              <div className="h-[1px] w-full bg-border relative flex items-center justify-center animate-line-draw">
                <div className="bg-background px-3.5 py-1 border border-accent/40 rounded-full flex items-center gap-2 shadow-xs animate-stamp-pop">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    ÚLTIMO CAMBIO: {ultimoEvento}
                  </span>
                </div>
              </div>
            </div>

            {/* Última revisión del sistema */}
            <div className="flex items-center gap-2 md:justify-end text-text-2">
              <span className="text-[10px] text-text-3 uppercase tracking-widest">Última revisión —</span>
              <span className="text-text-1 font-semibold tracking-wider">{ultimaRevision}</span>
            </div>
          </div>
        </div>

        {/* ── ESTRUCTURA ASIMÉTRICA PRINCIPAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* ── 2. BLOQUE DE CONTEXTO: 4 ESTADÍSTICAS EN MONOLITO CÍVICO VERDE BOSQUE PROFUNDO ── */}
          <div className="lg:col-span-4 relative rounded-2xl overflow-hidden p-6 sm:p-7 bg-forest-bg border border-forest-border shadow-md flex flex-col justify-between h-full text-white">
            {/* Sutil Retícula Milimétrica Documental en Tono Luz */}
            <div className="absolute inset-0 bg-grid-dark-documental mask-radial-fade pointer-events-none opacity-40" aria-hidden="true" />

            <div className="relative">
              {/* Título de sección centrado */}
              <div className="text-[11px] font-mono font-bold tracking-[0.2em] text-forest-accent uppercase pb-4 border-b border-forest-border text-center flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-accent-ok animate-pulse" />
                <span>ESTADO EN MOVIMIENTO</span>
              </div>

              {/* Grandes cifras editoriales de alto contraste */}
              <div className="py-6 sm:py-7 grid grid-cols-2 lg:grid-cols-1 gap-y-6 gap-x-3 text-center items-center">
                {/* 1. Movimientos */}
                <div>
                  <div className="font-serif text-4xl sm:text-5xl lg:text-6xl text-forest-text font-bold tracking-tight leading-none tabular-nums">
                    <MechanicalCounter target={total} delay={100} />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-forest-subtle uppercase mt-2">
                    MOVIMIENTOS REGISTRADOS
                  </div>
                </div>

                <div className="hidden lg:block w-12 h-[1px] bg-forest-border mx-auto" aria-hidden="true" />

                {/* 2. Renuncias */}
                <div>
                  <div className="font-serif text-4xl sm:text-5xl lg:text-6xl text-forest-text font-bold tracking-tight leading-none tabular-nums">
                    <MechanicalCounter target={renuncias} delay={220} />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-forest-subtle uppercase mt-2">
                    RENUNCIAS REGISTRADAS
                  </div>
                </div>

                {/* Divisor horizontal entre filas en móvil */}
                <div className="col-span-2 lg:hidden w-24 h-[1px] bg-forest-border mx-auto" aria-hidden="true" />
                <div className="hidden lg:block w-12 h-[1px] bg-forest-border mx-auto" aria-hidden="true" />

                {/* 3. Días Sin Cambios */}
                <div>
                  <div className="font-serif text-4xl sm:text-5xl lg:text-6xl text-forest-accent-ok font-bold tracking-tight leading-none tabular-nums drop-shadow-xs">
                    <MechanicalCounter target={diasSinCambios} padZero delay={360} className="text-forest-accent-ok" />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-forest-accent-ok font-semibold uppercase mt-2">
                    DÍAS SIN CAMBIOS
                  </div>
                </div>

                <div className="hidden lg:block w-12 h-[1px] bg-forest-border mx-auto" aria-hidden="true" />

                {/* 4. Días Entre Cambios */}
                <div>
                  <div className="font-serif text-4xl sm:text-5xl lg:text-6xl text-forest-text font-bold tracking-tight leading-none tabular-nums">
                    <MechanicalCounter target={diasEntreCambios} decimals={1} delay={500} />
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-forest-subtle uppercase mt-2">
                    DÍAS ENTRE CAMBIOS
                  </div>
                </div>
              </div>
            </div>

            {/* Remate inferior: enlace directo al archivo con botón integrado */}
            <div className="relative pt-6 border-t border-forest-border text-center">
              <Link
                href="/movimientos"
                prefetch={false}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-forest-card hover:opacity-90 border border-forest-border-subtle text-xs font-mono font-bold text-forest-text hover:text-forest-accent-ok transition-all group shadow-xs"
              >
                <span>Historial completo de movimientos</span>
                <span className="text-forest-accent-ok transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Últimos registros del release publicado */}
          <div className="lg:col-span-8 space-y-8">
            {/* ── 3. CAMBIO MÁS RECIENTE (PIEZA PROTAGONISTA: DOBLE JERARQUÍA) ── */}
            {leadMovement ? (
            <article className="border-l-2 border-accent bg-surface-2 p-5 sm:p-7 border-y sm:border-y-0 sm:border-r border-border rounded-none group transition-all duration-200">
              {/* Metadatos superiores con distintivo de último cambio */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ok-bg text-accent border border-accent/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>{leadMovement.status === "EN CONFIRMACIÓN" ? "ÚLTIMA SEÑAL PUBLICADA" : "ÚLTIMO MOVIMIENTO"}</span>
                  </span>
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-accent uppercase">
                    {leadMovement.category}
                  </span>
                  <span className="text-[10px] font-mono text-text-3 tracking-wider hidden sm:inline">
                    {leadMovement.refCode ? `• ${leadMovement.refCode}` : ""}
                  </span>
                </div>
                <div>{renderStatus(leadMovement.status)}</div>
              </div>

              {/* Contenido protagonista */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-8 items-start">
                {/* Fecha protagonista vertical centrada */}
                <div className="sm:col-span-3 flex flex-col items-center justify-center text-center font-mono leading-none select-none py-2 sm:border-r border-border/80 sm:pr-6">
                  {leadMovement.dateQualifier && <span className="text-[9px] font-bold tracking-wider text-warn mb-2">{leadMovement.dateQualifier}</span>}
                  <span className="font-serif text-5xl sm:text-6xl font-bold text-text-1 tracking-tight tabular-nums">
                    {leadMovement.day}
                  </span>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent mt-1.5">
                    {leadMovement.month}
                  </span>
                  <span className="text-[11px] text-text-3 tracking-widest mt-1">
                    {leadMovement.year}
                  </span>
                </div>

                {/* Titular y bajada protagonista */}
                <div className="sm:col-span-9 space-y-3">
                  <h3 className="font-serif text-2xl sm:text-3xl text-text-1 font-bold leading-snug tracking-tight group-hover:text-accent transition-colors duration-150">
                    {leadMovement.title}
                  </h3>
                  <p className="text-sm sm:text-base text-text-2 leading-relaxed">
                    {leadMovement.desc}
                  </p>
                </div>
              </div>

              {/* Pie de fuente y enlace protagonista */}
              <div className="mt-5 pt-3.5 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <span className="text-[11px] text-text-3 uppercase tracking-wider">
                  {leadMovement.source}
                </span>
                <Link
                  href={leadMovement.link}
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent hover:underline group/link"
                >
                  <span>ABRIR FICHA</span>
                  <span className="transition-transform group-hover/link:translate-x-1">→</span>
                </Link>
              </div>
            </article>
            ) : <p className="text-sm text-text-2">No hay movimientos publicados en este corte.</p>}

            {/* ── 4. REGISTROS ANTERIORES: ARCHIVO CRONOLÓGICO CON FECHAS CENTRADAS ── */}
            <div>
              {/* Encabezado de archivo */}
              <div className="flex items-center justify-between pb-3 mb-1 border-b border-border text-[10px] sm:text-[11px] font-mono text-text-3 uppercase tracking-widest">
                <span>REGISTROS ANTERIORES</span>
                <span>ARCHIVO CRONOLÓGICO</span>
              </div>

              {/* Registros anteriores disponibles */}
              <div className="divide-y divide-border/70">
                {archiveMovements.map((mov) => (
                  <article
                    key={mov.id}
                    className="py-6 sm:py-7 hover:bg-surface-2 transition-colors duration-150 group"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-8 items-start">
                      {/* Fecha grande centrada */}
                      <div className="sm:col-span-2 flex flex-col items-center justify-center text-center font-mono leading-none select-none py-1 sm:border-r border-border/80 sm:pr-6">
                        {mov.dateQualifier && <span className="text-[8px] font-bold tracking-wider text-warn mb-1.5">{mov.dateQualifier}</span>}
                        <span className="font-serif text-3xl sm:text-4xl font-bold text-text-1 tracking-tight tabular-nums">
                          {mov.day}
                        </span>
                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider mt-1.5">
                          {mov.month}
                        </span>
                        <span className="text-[10px] text-text-3 tracking-widest mt-1">
                          {mov.year}
                        </span>
                      </div>

                      {/* Cuerpo del registro */}
                      <div className="sm:col-span-10 space-y-2">
                        {/* Categoría, referencia y estado */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-text-2 uppercase">
                              {mov.category}
                            </span>
                            <span className="text-[10px] font-mono text-text-3 hidden sm:inline">
                              • {mov.refCode}
                            </span>
                          </div>
                          <div>{renderStatus(mov.status)}</div>
                        </div>

                        {/* Titular */}
                        <h4 className="font-serif text-base sm:text-lg text-text-1 font-bold leading-snug group-hover:text-accent transition-colors duration-150">
                          {mov.title}
                        </h4>

                        {/* Descripción breve */}
                        <p className="text-xs sm:text-sm text-text-2 leading-relaxed">
                          {mov.desc}
                        </p>

                        {/* Fuente y enlace */}
                        <div className="pt-2 flex items-center justify-between text-xs font-mono">
                          <span className="text-[10px] sm:text-[11px] text-text-3 uppercase tracking-wider">
                            {mov.source}
                          </span>
                          <Link
                            href={mov.link}
                            prefetch={false}
                            className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-accent hover:underline group/itemlink"
                          >
                            <span>ABRIR FICHA</span>
                            <span className="transition-transform group-hover/itemlink:translate-x-0.5">→</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MovementsTimeline;
