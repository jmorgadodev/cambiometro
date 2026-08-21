"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const prevRef = useRef<string>("");

  const key = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (prevRef.current && prevRef.current !== key) {
      setActive(true);
      setProgress(15);
      const t1 = window.setTimeout(() => setProgress(70), 80);
      const t2 = window.setTimeout(() => setProgress(88), 320);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setProgress(100);
        window.setTimeout(() => {
          setActive(false);
          setProgress(0);
        }, 180);
      }, 700) as unknown as number;
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    prevRef.current = key;
  }, [key]);

  if (!active && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "2.5px",
        width: `${progress}%`,
        background: "var(--accent, #0ea5e9)",
        zIndex: 9999,
        transition: progress === 100 ? "width 180ms ease-out, opacity 180ms ease" : "width 320ms ease-out",
        opacity: active || progress < 100 ? 1 : 0,
        pointerEvents: "none",
      }}
    />
  );
}
