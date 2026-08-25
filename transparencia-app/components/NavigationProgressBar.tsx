"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import LoadingOrb from "@/components/LoadingOrb";

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const prevRef = useRef<string>("");

  // Query-string changes are filter updates inside the current page, not a
  // document navigation. Keeping this keyed to the pathname also avoids a
  // static-export bailout through next/navigation's useSearchParams().
  const key = pathname;

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
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "2.5px",
          width: `${progress}%`,
          background: "var(--accent)",
          zIndex: 9999,
          transition: progress === 100 ? "width 180ms ease-out, opacity 180ms ease" : "width 320ms ease-out",
          opacity: active || progress < 100 ? 1 : 0,
          pointerEvents: "none",
        }}
      />
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 9998,
            pointerEvents: "none",
            transition: "opacity 200ms ease",
            opacity: active ? 1 : 0,
          }}
        >
          <LoadingOrb size={44} inline label="" />
        </div>
      )}
    </>
  );
}
