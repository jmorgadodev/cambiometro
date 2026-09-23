"use client";
import { useEffect, useRef, useState } from "react";

interface MechanicalCounterProps {
  target: number;
  decimals?: number;
  padZero?: boolean;
  delay?: number;
  className?: string;
  onComplete?: () => void;
}

/**
 * MechanicalCounter
 * Simula un contador analógico / odómetro de precisión o teletipo judicial.
 * Avanza en saltos rítmicos discretos con desaceleración mecánica.
 */
export default function MechanicalCounter({
  target,
  decimals = 0,
  padZero = false,
  delay = 0,
  className = "",
  onComplete,
}: MechanicalCounterProps) {
  const [value, setValue] = useState<number>(target);
  const [isCompleted, setIsCompleted] = useState<boolean>(true);
  const containerRef = useRef<HTMLSpanElement>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (onComplete) onComplete();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          observer.disconnect();

          const generateSteps = (): number[] => {
            if (target === 0) return [0];

            if (decimals > 0) {
              const stepCount = 8;
              const steps: number[] = [];
              for (let i = 1; i < stepCount; i++) {
                const ratio = i / stepCount;
                const val = Number((target * Math.pow(ratio, 0.65)).toFixed(decimals));
                steps.push(val);
              }
              steps.push(target);
              return Array.from(new Set(steps));
            }

            if (target <= 10) {
              const steps: number[] = [];
              for (let i = 1; i <= target; i++) {
                steps.push(i);
              }
              return steps;
            }

            const count = Math.min(target, 9);
            const steps: number[] = [];
            for (let i = 1; i < count; i++) {
              const ratio = i / count;
              const val = Math.round(target * Math.pow(ratio, 0.7));
              steps.push(val);
            }
            steps.push(target);
            return Array.from(new Set(steps));
          };

          const steps = generateSteps();
          let currentStepIdx = 0;

          const baseInterval = 65;
          const stepTimer = () => {
            if (currentStepIdx >= steps.length) {
              setValue(target);
              setIsCompleted(true);
              if (onComplete) onComplete();
              return;
            }

            setValue(steps[currentStepIdx]);
            currentStepIdx++;

            const progress = currentStepIdx / steps.length;
            const nextInterval = baseInterval + Math.pow(progress, 2.2) * 160;

            setTimeout(stepTimer, nextInterval);
          };

          setTimeout(stepTimer, delay);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, decimals, delay, onComplete]);

  const formatDisplay = (num: number): string => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    if (padZero && num < 10) {
      return `0${Math.round(num)}`;
    }
    return Math.round(num).toString();
  };

  return (
    <span
      ref={containerRef}
      className={`tabular-nums font-mono transition-colors duration-300 ${
        isCompleted ? "brightness-105" : "brightness-95"
      } ${className}`}
    >
      {formatDisplay(value)}
    </span>
  );
}
