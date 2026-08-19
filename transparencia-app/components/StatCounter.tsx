"use client";

import { useEffect, useRef, useState } from "react";

interface StatCounterProps {
  value: number;
  delay?: number;
}

export default function StatCounter({ value, delay = 0 }: StatCounterProps) {
  const ref = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          io.disconnect();
          const t0 = performance.now();
          const duration = 900 + delay;
          const ease = (x: number) => 1 - Math.pow(1 - x, 3);
          setDisplay(0);
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            setDisplay(Math.round(value * ease(p)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, delay]);

  return <strong ref={ref}>{display.toLocaleString("es-CL")}</strong>;
}