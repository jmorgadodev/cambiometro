"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import LoadingOrb from "@/components/LoadingOrb";

export default function RouteTransitionOrb() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);

  const transitionStartRef = useRef<number>(0);
  const hideTimeoutRef = useRef<number | null>(null);
  const maxVisibleTimeoutRef = useRef<number | null>(null);
  const prevKeyRef = useRef<string>("");

  const searchStr = searchParams?.toString() ?? "";
  const currentKey = `${pathname}?${searchStr}`;

  // Desvanecimiento del splash inicial SSR tras la hidratacion SIN remover el nodo del DOM
  useEffect(() => {
    const splash = document.getElementById("initial-splash-orb");
    if (!splash) return;

    let removeTimeout: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      splash.classList.add("initial-splash-orb--hidden");
      // El splash es SSR-only. Retirarlo evita dejar un loader oculto en el
      // árbol accesible y permite que los crawlers/E2E vean sólo contenido real.
      removeTimeout = window.setTimeout(() => splash.remove(), 300);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (removeTimeout) window.clearTimeout(removeTimeout);
    };
  }, []);

  // Delegacion de eventos en clicks a enlaces internos gestionada exclusivamente con estado React
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

  // Ocultar cuando la ruta cambia y el nuevo contenido monta, garantizando tiempo minimo de 350ms
  useEffect(() => {
    if (!prevKeyRef.current) {
      prevKeyRef.current = currentKey;
      return;
    }

    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;

      const elapsed = Date.now() - transitionStartRef.current;
      const minVisibleMs = 350;
      const remainingMs = Math.max(0, minVisibleMs - elapsed);

      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);

      hideTimeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, remainingMs);
    }
  }, [currentKey]);

  // Una navegación rota no puede dejar el overlay activo indefinidamente.
  useEffect(() => {
    if (!isVisible) return;

    if (maxVisibleTimeoutRef.current) window.clearTimeout(maxVisibleTimeoutRef.current);
    maxVisibleTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      maxVisibleTimeoutRef.current = null;
    }, 5000);

    return () => {
      if (maxVisibleTimeoutRef.current) {
        window.clearTimeout(maxVisibleTimeoutRef.current);
        maxVisibleTimeoutRef.current = null;
      }
    };
  }, [isVisible]);

  useEffect(() => () => {
    if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    if (maxVisibleTimeoutRef.current) window.clearTimeout(maxVisibleTimeoutRef.current);
  }, []);

  // No dejes un loader oculto en el DOM: los tests y las tecnologías de apoyo
  // deben ver únicamente un overlay mientras existe una navegación real.
  if (!isVisible) return null;

  return (
    <div
      id="route-transition-overlay"
      className={`route-transition-overlay ${isVisible ? "is-active" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={isVisible}
      aria-label="Cargando nueva sección..."
    >
      <div className="route-transition-card">
        <LoadingOrb size={56} label="Cargando contenido..." />
      </div>
    </div>
  );
}
