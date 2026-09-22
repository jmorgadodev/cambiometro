"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/assets/lamoneda.jpg", alt: "Palacio de La Moneda y bandera de Chile", label: "Poder Ejecutivo" },
  { src: "/assets/congreso.jpg", alt: "Congreso Nacional de Chile en Valparaíso", label: "Poder Legislativo" },
  { src: "/assets/cordillera.jpg", alt: "Cordillera de Los Andes y territorio chileno", label: "Territorio nacional" },
] as const;

export default function HeroPhotography() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="editorial-hero__visual">
      <div className="editorial-hero__photo">
        {slides.map((slide, index) => (
          <div className="editorial-hero__slide" data-active={active === index} key={slide.src} aria-hidden={active !== index}>
            <Image src={slide.src} alt={active === index ? slide.alt : ""} fill priority={index === 0} sizes="(max-width: 1000px) 100vw, 50vw" className="editorial-hero__image" />
          </div>
        ))}
        <div className="editorial-hero__dots" aria-label="Fotografías de la portada">
          {slides.map((slide, index) => (
            <button key={slide.src} type="button" className={active === index ? "is-active" : ""} aria-label={`Ver ${slide.label}`} aria-pressed={active === index} onClick={() => setActive(index)} />
          ))}
        </div>
      </div>
      <blockquote className="editorial-hero__note">“La información también es ciudadanía.”</blockquote>
    </div>
  );
}
