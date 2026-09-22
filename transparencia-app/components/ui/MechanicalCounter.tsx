"use client";

import { useEffect, useRef, useState } from "react";

interface MechanicalCounterProps {
  value: number;
  decimals?: number;
  minimumIntegerDigits?: number;
  delay?: number;
  className?: string;
  suffix?: string;
}

function formatValue(value: number, decimals: number, minimumIntegerDigits: number) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    minimumIntegerDigits,
  }).format(value);
}

/**
 * Odómetro editorial que avanza en saltos discretos y conserva el ancho del
 * valor final desde el primer render para evitar desplazamientos de layout.
 */
export default function MechanicalCounter({
  value,
  decimals = 0,
  minimumIntegerDigits = 1,
  delay = 0,
  className = "",
  suffix = "",
}: MechanicalCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || started.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      started.current = true;
      return;
    }

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const stepCount = Math.max(1, Math.min(10, Math.round(Math.abs(value))));
        setDisplay(0);

        for (let step = 1; step <= stepCount; step += 1) {
          const progress = step / stepCount;
          const nextValue = value * Math.pow(progress, 0.68);
          const timer = setTimeout(
            () => setDisplay(step === stepCount ? value : Number(nextValue.toFixed(decimals))),
            delay + step * 70 + Math.pow(progress, 2.2) * 130,
          );
          timers.add(timer);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [value, decimals, delay]);

  const formatted = formatValue(display, decimals, minimumIntegerDigits);
  const finalFormatted = formatValue(value, decimals, minimumIntegerDigits);

  return (
    <span
      ref={ref}
      className={`mechanical-counter ${className}`.trim()}
      aria-label={`${finalFormatted}${suffix}`}
      style={{ minWidth: `${finalFormatted.length + suffix.length}ch` }}
    >
      <span aria-hidden="true">{formatted}{suffix}</span>
    </span>
  );
}
