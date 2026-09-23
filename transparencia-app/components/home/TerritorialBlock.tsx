"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "./Icons";

export interface TerritorialBlockProps {
  municipios?: number;
  gobReg?: number;
  renuncias?: number;
  verificados?: number;
  enConfirmacion?: number;
}

export function TerritorialBlock({
  municipios = 346,
  gobReg = 16,
}: TerritorialBlockProps) {
  const hasEntered = true;

  return (
    <section
      className="relative overflow-hidden py-14 sm:py-18 border-b border-border bg-surface-2"
    >
      {/* Sutil Retícula Milimétrica Documental */}
      <div className="absolute inset-0 bg-grid-documental mask-radial-fade pointer-events-none opacity-70" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Territorial Scope Statement */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-accent uppercase">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>TERRITORIO & COBERTURA NACIONAL</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-text-1 leading-tight">
              Fiscalización desde Arica hasta Magallanes.
            </h2>

            <p className="text-sm sm:text-base text-text-2 leading-relaxed">
              Consolidamos información de las <strong>346 comunas de Chile</strong>, los <strong>16 gobiernos regionales</strong> y todos los servicios de la administración pública central bajo un estándar documental homogéneo y comparable.
            </p>

            {/* Scope Badges en Panel de Cobertura Territorial en Verde Bosque Profundo */}
            <div className="relative rounded-2xl p-3.5 sm:p-5 bg-forest-bg border border-forest-border overflow-hidden shadow-sm text-white">
              <div className="absolute inset-0 bg-grid-dark-documental mask-radial-fade pointer-events-none opacity-40" aria-hidden="true" />
              <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
                <div
                  style={{
                    opacity: hasEntered ? 1 : 0,
                    transform: hasEntered ? "translateY(0)" : "translateY(10px)",
                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
                  }}
                  className="p-2 sm:p-3 rounded-xl bg-forest-card/90 border border-forest-border-subtle text-center shadow-xs"
                >
                  <div className="font-serif text-lg sm:text-2xl font-bold text-forest-text">{municipios}</div>
                  <div className="text-[9px] sm:text-[11px] font-mono text-forest-subtle">Municipios</div>
                </div>
                <div
                  style={{
                    opacity: hasEntered ? 1 : 0,
                    transform: hasEntered ? "translateY(0)" : "translateY(10px)",
                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
                  }}
                  className="p-2 sm:p-3 rounded-xl bg-forest-card/90 border border-forest-border-subtle text-center shadow-xs"
                >
                  <div className="font-serif text-lg sm:text-2xl font-bold text-forest-text">{gobReg}</div>
                  <div className="text-[9px] sm:text-[11px] font-mono text-forest-subtle truncate">Gob. Reg.</div>
                </div>
                <div
                  style={{
                    opacity: hasEntered ? 1 : 0,
                    transform: hasEntered ? "translateY(0)" : "translateY(10px)",
                    transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s",
                  }}
                  className="p-2 sm:p-3 rounded-xl bg-forest-card/90 border border-forest-border-subtle text-center shadow-xs"
                >
                  <div className="font-serif text-base sm:text-2xl font-bold text-forest-accent-ok">INE 2024</div>
                  <div className="text-[9px] sm:text-[11px] font-mono text-forest-subtle">Censo Oficial</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Link
                href="/municipalidades"
                prefetch={false}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent hover:opacity-90 text-on-accent font-semibold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md group"
              >
                <span>Explorar comparador territorial de comunas</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column: Landscape Visual Frame */}
          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden shadow-editorial border border-border aspect-[16/10] group">
            <img
              src="/assets/patagonia.jpg"
              alt="Cordillera y glaciares de la Patagonia chilena bajo luz crepuscular"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* Editorial Quote Card Overlay en Verde Bosque */}
            <div
              style={{
                opacity: hasEntered ? 1 : 0,
                transform: hasEntered ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s",
              }}
              className="absolute bottom-5 left-5 right-5 p-4 rounded-xl bg-forest-bg/95 backdrop-blur-md border border-forest-border text-white shadow-md"
            >
              <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-forest-accent mb-1">
                DEMOCRACIA TERRITORIAL
              </div>
              <p className="text-xs sm:text-sm italic font-serif leading-snug text-forest-text">
                “La descentralización requiere datos locales limpios: presupuestos municipales, compras y nóminas en cada rincón del país.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TerritorialBlock;
