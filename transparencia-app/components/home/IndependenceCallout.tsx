"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Heart } from "./Icons";

export function IndependenceCallout() {
  return (
    <section className="relative overflow-hidden py-14 sm:py-16 bg-forest-bg text-white border-b border-forest-border transition-colors duration-200">
      {/* Sutil Retícula Milimétrica Documental en tono luz */}
      <div className="absolute inset-0 bg-grid-dark-documental mask-radial-fade pointer-events-none opacity-50" aria-hidden="true" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-forest-accent uppercase">
              <ShieldCheck className="w-4 h-4 text-forest-accent" />
              <span>INDEPENDENCIA TÉCNICA & TRANSPARENCIA ÉTICA</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-forest-text">
              Fiscalizar requiere autonomía técnica.
            </h2>

            <p className="text-sm sm:text-base text-forest-subtle leading-relaxed">
              El Cambiómetro opera sin financiamiento de partidos políticos ni de empresas con contratos vigentes con el Estado. Los aportes de la ciudadanía ayudan a mantener esta herramienta de consulta y fiscalización independiente.
            </p>
          </div>

          <div className="flex items-center shrink-0">
            <Link
              href="/donar"
              prefetch={false}
              className="px-6 py-3 rounded-lg bg-forest-accent hover:opacity-90 text-forest-bg font-bold text-sm transition-all duration-200 shadow-md flex items-center gap-2 group cursor-pointer"
            >
              <Heart className="w-4 h-4 text-forest-bg fill-current" />
              <span>Apóyanos</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IndependenceCallout;
