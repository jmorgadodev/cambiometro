"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useEffect, useState, startTransition } from "react";
import Icono from "@/components/ui/Icono";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

/**
 * Orden narrativo canónico por clústeres estructurados:
 * 1. Poder & Decisión: Análisis Parlamentario · Partidos · Directorio de Personas
 * 2. Ejecución & Territorio: Servicios públicos · Municipalidades · Transferencias
 * 3. Vínculos & Dinámicas: Cruces · Movimientos
 * 4. Meta & Transparencia: Datos · Metodología
 */
export const NAV_CLUSTERS = [
  {
    clusterName: "Poder & Decisión",
    items: [
      { href: "/politico", label: "Análisis Parlamentario" },
      { href: "/partidos", label: "Partidos" },
      { href: "/personas", label: "Directorio de Personas" },
    ],
  },
  {
    clusterName: "Ejecución & Territorio",
    items: [
      { href: "/servicios-publicos", label: "Servicios públicos" },
      { href: "/municipalidades", label: "Municipalidades" },
      { href: "/transferencias", label: "Transferencias" },
    ],
  },
  {
    clusterName: "Vínculos & Dinámicas",
    items: [
      { href: "/cruces", label: "Cruces" },
      { href: "/movimientos", label: "Movimientos" },
    ],
  },
  {
    clusterName: "Meta & Transparencia",
    items: [
      { href: "/datos", label: "Datos" },
      { href: "/como-funciona", label: "Metodología" },
    ],
  },
];

interface SiteHeaderProps {
  updatedAt?: string | null;
  totalRecords?: number;
}

export default function SiteHeader({ updatedAt, totalRecords }: SiteHeaderProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const displayTotal = totalRecords && totalRecords > 0 ? totalRecords : GLOBAL_KPIS.registros_canonicos;
  const displayCorte = updatedAt || GLOBAL_KPIS.corte;

  // Sincronizar tema claro / oscuro desde localStorage o media query
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const savedTheme = localStorage.getItem("cambiometro-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        setIsDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        setIsDark(false);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    startTransition(() => setDrawerOpen(false));
  }, [pathname]);

  // Manejo de tecla Escape y bloqueo de scroll al abrir drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    }
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("cambiometro-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("cambiometro-theme", "light");
    }
  };

  return (
    <>
      <header className="site-header">
        {/* ─── FILA 1: DESKTOP (≥1024px) / FILA ÚNICA MÓVIL (<1024px) ───────── */}
        <div className="container-main site-header__primary">
          <Link href="/" className="site-brand" aria-label="El Cambiómetro, inicio">
            <Image
              src="/brand/el-cambiometro-mark.svg"
              alt="Símbolo dial El Cambiómetro"
              width={34}
              height={34}
              className="site-brand__dial"
              priority
            />
            <div className="site-brand__text">
              <strong>EL CAMBIÓMETRO</strong>
              <small className="site-brand__tagline">EVIDENCIA PÚBLICA TRAZABLE</small>
            </div>
          </Link>

          <div className="site-header__actions">
            {/* Chip de corte (Solo visible en Desktop ≥1024px) */}
            <Link
              href="/como-funciona#fuentes"
              className="snapshot-stamp"
              aria-label={`Corte oficial: ${displayTotal.toLocaleString("es-CL")} registros`}
            >
              <span className="snapshot-stamp__status" aria-hidden="true" />
              <span>
                <strong>{displayTotal.toLocaleString("es-CL")} registros</strong>
                <small>{displayCorte ? `Corte ${displayCorte}` : "Corte oficial"}</small>
              </span>
            </Link>

            {/* Toggle de tema (Touch target ≥ 44px en ambos breakpoints) */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              <Icono nombre={isDark ? "sun" : "moon"} size={18} />
            </button>

            {/* Botón de Secciones (Solo visible en móvil <1024px, touch target ≥ 44px) */}
            <button
              type="button"
              className="site-menu-button"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú de secciones"
            >
              <Icono nombre="menu" size={18} />
              <span>Secciones</span>
            </button>
          </div>
        </div>

        {/* ─── FILA 2: NAV DESKTOP (≥1024px, Oculto en móvil) ───────────────── */}
        <div className="site-header__nav-row">
          <nav id="site-navigation" className="container-main site-nav" aria-label="Navegación principal">
            {NAV_CLUSTERS.map((cluster, clusterIdx) => (
              <React.Fragment key={`cluster-${clusterIdx}`}>
                {clusterIdx > 0 && (
                  <span className="site-nav__separator" aria-hidden="true">
                    |
                  </span>
                )}
                {cluster.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="site-nav__link"
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── DRAWER MÓVIL (<1024px, Slide-in <200ms) ───────────────────────── */}
      {drawerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-drawer"
        className={`mobile-drawer${drawerOpen ? " is-open" : ""}`}
        aria-modal="true"
        role="dialog"
        aria-label="Menú de navegación"
        aria-hidden={!drawerOpen}
      >
        <div className="mobile-drawer__header">
          <div className="mobile-drawer__brand">
            <Image
              src="/brand/el-cambiometro-mark.svg"
              alt=""
              width={26}
              height={26}
              aria-hidden="true"
            />
            <strong>Secciones</strong>
          </div>
          <button
            type="button"
            className="mobile-drawer__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú de secciones"
          >
            <Icono nombre="close" size={20} />
          </button>
        </div>

        <nav className="mobile-drawer__body" aria-label="Navegación principal">
          {NAV_CLUSTERS.map((cluster, clusterIdx) => (
            <div className="mobile-drawer__cluster" key={`m-cluster-${clusterIdx}`}>
              <span className="mobile-drawer__cluster-title">{cluster.clusterName}</span>
              <ul className="mobile-drawer__list">
                {cluster.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                  return (
                    <li key={`m-${item.href}`}>
                      <Link
                        href={item.href}
                        className={`mobile-drawer__link${isActive ? " is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <span>{item.label}</span>
                        {isActive && <Icono nombre="check" size={14} style={{ color: "var(--accent)" }} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mobile-drawer__footer">
          {/* Chip de corte en el drawer */}
          <Link
            href="/como-funciona#fuentes"
            className="drawer-snapshot-stamp"
            onClick={() => setDrawerOpen(false)}
            aria-label={`Corte de datos: ${displayTotal.toLocaleString("es-CL")} registros`}
          >
            <span className="snapshot-stamp__status" aria-hidden="true" />
            <span>
              <strong>{displayTotal.toLocaleString("es-CL")} registros</strong>
              <small>{displayCorte ? `Corte ${displayCorte}` : "Corte oficial"}</small>
            </span>
          </Link>

          {/* Enlaces de pie y Donación */}
          <div className="mobile-drawer__actions">
            <a
              href="https://www.instagram.com/cambiometro/"
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-social-link"
              aria-label="Seguir a @cambiometro en Instagram"
            >
              <span>Instagram @cambiometro</span>
            </a>
            <a
              href="https://x.com/cambiometro"
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-social-link"
              aria-label="Seguir a @cambiometro en X"
            >
              <span>𝕏 @cambiometro</span>
            </a>
            <Link
              href="/donar"
              className="btn btn-primary drawer-donate-btn"
              onClick={() => setDrawerOpen(false)}
            >
              Donar y apoyar
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
