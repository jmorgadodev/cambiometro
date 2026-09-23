"use client";
import React, { useEffect, useRef, useState } from "react";

interface StatCounterProps {
  target: number;
  suffix?: string;
  delay?: number;
  duration?: number;
}

export function StatCounter({
  target,
  suffix = "",
  delay = 0,
  duration = 1100,
}: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(target);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          const startTime = performance.now() + delay;
          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

          const animate = (currentTime: number) => {
            if (currentTime < startTime) {
              requestAnimationFrame(animate);
              return;
            }

            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentCount = Math.round(target * easeOutCubic(progress));

            setCount(currentCount);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, delay, duration]);

  return (
    <span ref={ref} className="font-serif">
      {count.toLocaleString("es-CL")}
      {suffix}
    </span>
  );
}

export default StatCounter;
