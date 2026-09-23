"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "./Icons";

// Bespoke Civic Journalism Iconography (Unique, non-generic)
const OfficialDocketIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="12" cy="14" r="3" />
    <path d="m10.8 14 1 1 1.8-2" />
  </svg>
);

const TraceableDataIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="15" width="3.2" height="6" rx="0.75" />
    <rect x="8.5" y="11" width="3.2" height="10" rx="0.75" />
    <rect x="14" y="7" width="3.2" height="14" rx="0.75" />
    <path d="M4.5 12l5-4 5.5 3 5.5-7" />
    <circle cx="20.5" cy="4" r="1.5" fill="currentColor" />
  </svg>
);

const CitizenAssemblyIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="7" r="3" />
    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="5" cy="9" r="2" />
    <path d="M1 21v-1.5a3 3 0 0 1 3-3h1" />
    <circle cx="19" cy="9" r="2" />
    <path d="M23 21v-1.5a3 3 0 0 1-3-3h1" />
  </svg>
);

interface SlideData {
  id: string;
  image: string;
  alt: string;
  label: string;
}

const slides: SlideData[] = [
  {
    id: "congreso",
    image: "/assets/congreso.jpg",
    alt: "Congreso Nacional de Chile en Valparaíso",
    label: "Poder Legislativo",
  },
  {
    id: "moneda",
    image: "/assets/lamoneda.jpg",
    alt: "Palacio de La Moneda y bandera de Chile",
    label: "Poder Ejecutivo",
  },
  {
    id: "cordillera",
    image: "/assets/cordillera.jpg",
    alt: "Cordillera de Los Andes y territorio chileno",
    label: "Territorio Nacional",
  },
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <section className="relative pt-6 pb-24 sm:pt-8 sm:pb-28 lg:pt-12 lg:pb-32 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center min-h-[520px] lg:min-h-[580px]">
          {/* Left Column: Editorial Statement (Span 6) */}
          <div className="lg:col-span-6 flex flex-col justify-center pr-0 lg:pr-6 z-10 space-y-5 sm:space-y-6">
            {/* Kicker Pill Tag */}
            <div className="animate-hero-kicker inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ok-bg border border-border text-xs font-mono font-medium text-accent w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>DATOS ABIERTOS • FISCALIZACIÓN CIUDADANA</span>
            </div>

            {/* Main Headline */}
            <h1 className="animate-hero-title font-serif text-3xl sm:text-5xl lg:text-[62px] leading-[1.1] sm:leading-[1.08] text-text-1 font-bold tracking-tight">
              Un Chile más transparente{" "}
              <span className="italic font-normal text-accent underline decoration-accent/30 underline-offset-8 block sm:inline">
                es posible.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-hero-desc text-sm sm:text-base lg:text-lg text-text-2 max-w-xl font-normal leading-relaxed">
              Exploramos, visualizamos y conectamos información pública oficial para que cualquier persona pueda entender, comparar y auditar las decisiones, gastos y votaciones en el Estado de Chile.
            </p>

            {/* CTAs */}
            <div className="animate-hero-actions flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Link
                href="/politico"
                prefetch={false}
                className="group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-accent hover:opacity-90 text-on-accent font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 text-center"
              >
                <span>Explorar datos oficiales</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/como-funciona"
                prefetch={false}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface hover:bg-surface-2 border border-border text-text-1 font-medium text-sm transition-colors duration-200 shadow-sm text-center"
              >
                <FileText className="w-4 h-4 text-text-3" />
                <span>Cómo se valida la evidencia</span>
              </Link>
            </div>

            {/* 3 Bespoke Trust Checkpoints */}
            <div className="animate-hero-checkpoints grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-5 sm:pt-6 border-t border-border">
              {/* Item 1 */}
              <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-3 text-left group">
                <div className="text-accent shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <OfficialDocketIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-text-1 leading-snug">
                    Fuentes oficiales
                  </div>
                  <div className="text-[11px] text-text-3 leading-tight">
                    verificadas en origen
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-3 text-left group">
                <div className="text-accent shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <TraceableDataIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-text-1 leading-snug">
                    Datos trazables
                  </div>
                  <div className="text-[11px] text-text-3 leading-tight">
                    y actualizados
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-3 text-left group">
                <div className="text-accent shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <CitizenAssemblyIcon className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-text-1 leading-snug">
                    Información abierta
                  </div>
                  <div className="text-[11px] text-text-3 leading-tight">
                    para la ciudadanía
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Photography Slider + Depth Backdrop + Tactile Sticky Note */}
          <div className="lg:col-span-6 relative flex items-center justify-center min-h-[360px] sm:min-h-[460px] lg:min-h-[580px] overflow-visible mt-2 lg:mt-0">
            {/* Layer 1: Architectural Backdrop Depth Plate */}
            <div
              className="hidden lg:block absolute inset-0 -translate-x-3 translate-y-3 rounded-2xl bg-surface-2 border border-border clip-hero-backdrop opacity-70 pointer-events-none"
              aria-hidden="true"
            />

            {/* Layer 2: Photographic Slider Container */}
            <div className="animate-hero-photo-reveal relative w-full h-full min-h-[360px] sm:min-h-[460px] lg:min-h-[580px] rounded-2xl overflow-hidden shadow-2xl bg-surface border border-border clip-hero-editorial group">
              {/* Image Crossfade Carousel */}
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover object-center filter brightness-95 contrast-105 transition-transform duration-7000 ease-out transform scale-100 hover:scale-105"
                  />
                  {/* Subtle atmospheric gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              ))}

              {/* Minimalist Slide Selector */}
              <div className="absolute bottom-4 left-4 sm:bottom-5 sm:left-6 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentSlide
                        ? "w-6 h-1.5 bg-accent"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                    title={`Cambiar a vista: ${s.label}`}
                    aria-label={`Ver ${s.label}`}
                  />
                ))}
              </div>
            </div>

            {/* Layer 3: Fixed Physical Editorial Note */}
            <div
              className="absolute -bottom-5 sm:-bottom-6 left-4 right-4 sm:left-auto sm:right-6 lg:right-8 z-30 max-w-[320px] mx-auto sm:mx-0 bg-postit-bg border border-border p-5 sm:p-6 rounded-sm shadow-postit -rotate-2 hover:-rotate-1 hover:-translate-y-0.5 transition-all duration-300 select-none"
              title="Principio Cívico • El Cambiómetro"
            >
              {/* Minimalist Washi Tape Strip */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-postit-tape backdrop-blur-sm rounded-xs border border-postit-tape-border shadow-xs -rotate-1 pointer-events-none" />

              {/* Static Iconic Principle */}
              <div className="pt-1">
                <p className="font-hand text-2xl sm:text-[27px] leading-snug text-text-1 tracking-wide">
                  “La información también es ciudadanía.”
                </p>
              </div>

              {/* Editorial Accent Dash */}
              <div className="w-8 h-0.5 bg-accent mt-3 opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
