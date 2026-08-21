"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPathRef = useRef(`${pathname}?${searchParams.toString()}`);

  // Completar barra y desvanecer cuando cambia la ruta
  useEffect(() => {
    const currentPath = `${pathname}?${searchParams.toString()}`;
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      const t1 = setTimeout(() => {
        setProgress(100);
      }, 0);
      const t2 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pathname, searchParams]);

  // Interceptar clicks en enlaces internos para feedback visual inmediato (<10ms)
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(href, window.location.origin);

      if (nextUrl.origin === currentUrl.origin) {
        const isSame = nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search;
        if (!isSame) {
          setVisible(true);
          setProgress(25);
        }
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  // Avance progresivo mientras resuelve la navegación
  useEffect(() => {
    if (!visible || progress >= 100) return;

    const t1 = setTimeout(() => {
      setProgress((prev) => (prev < 60 ? 60 : prev));
    }, 150);

    const t2 = setTimeout(() => {
      setProgress((prev) => (prev < 85 ? 85 : prev));
    }, 450);

    const t3 = setTimeout(() => {
      setProgress((prev) => (prev < 95 ? 95 : prev));
    }, 1200);

    const maxTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(maxTimer);
    };
  }, [visible, progress]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="nav-progress-bar-container"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        pointerEvents: "none",
        background: "transparent",
      }}
      aria-hidden="true"
    >
      <div
        className="nav-progress-bar"
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "var(--accent)",
          boxShadow: "0 0 8px var(--accent-glow)",
          transition: progress === 100 ? "width 150ms ease-out, opacity 200ms ease" : "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: visible ? 1 : 0,
          transformOrigin: "left center",
        }}
      />
    </div>
  );
}
