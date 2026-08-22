"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingOrb from "@/components/LoadingOrb";

export default function RouteTransitionOrb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const transitionStartRef = useRef<number>(0);
  const hideTimeoutRef = useRef<number | null>(null);
  const prevKeyRef = useRef<string>("");

  const searchStr = searchParams?.toString() ?? "";
  const currentKey = `${pathname}?${searchStr}`;

  // Retiro del splash inicial SSR tras la hidratacion
  useEffect(() => {
    const splash = document.getElementById("initial-splash-orb");
    if (splash) {
      requestAnimationFrame(() => {
        splash.classList.add("initial-splash-orb--hidden");
        window.setTimeout(() => {
          splash.remove();
        }, 220);
      });
    }
  }, []);

  // Delegacion de eventos en clicks a enlaces internos
  useEffect(() => {
    function handleAnchorClick(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin !== currentUrl.origin) return;

        const isSamePath = targetUrl.pathname === currentUrl.pathname;
        const isSameSearch = targetUrl.search === currentUrl.search;
        if (isSamePath && isSameSearch) return;

        if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);

        transitionStartRef.current = Date.now();
        setIsTransitioning(true);
        setIsVisible(true);
      } catch {
        // Ignorar URLs invalidas
      }
    }

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, []);

  // Ocultar cuando la ruta cambia y el nuevo contenido monta
  useEffect(() => {
    if (!prevKeyRef.current) {
      prevKeyRef.current = currentKey;
      return;
    }

    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;

      if (isTransitioning) {
        const elapsed = Date.now() - transitionStartRef.current;
        const minVisibleMs = 350;
        const remainingMs = Math.max(0, minVisibleMs - elapsed);

        if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);

        hideTimeoutRef.current = window.setTimeout(() => {
          requestAnimationFrame(() => {
            setIsVisible(false);
            window.setTimeout(() => {
              setIsTransitioning(false);
            }, 200);
          });
        }, remainingMs);
      }
    }
  }, [currentKey, isTransitioning]);

  return (
    <div
      className={`route-transition-overlay ${isVisible ? "is-active" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={isTransitioning}
      aria-label="Cargando nueva sección..."
    >
      <div className="route-transition-card">
        <LoadingOrb size={56} label="Cargando contenido..." />
      </div>
    </div>
  );
}
