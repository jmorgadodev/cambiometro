"use client";

import SourceLink from "@/components/data/SourceLink";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import { ACTIVE_MODULES, CONSTRUCTION_MODULES, activeModuleForPath, normalizeSitePath } from "@/lib/site-modules";
import { THEME_ORDER, type ThemeName } from "@/lib/theme-tokens";

export default function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("paper");
  const previousPathname = useRef(pathname);
  const pathnameEffectReady = useRef(false);
  const moreMenu = useRef<HTMLDetailsElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeMore = (event: PointerEvent) => {
      if (event.target instanceof Node && !moreMenu.current?.contains(event.target)) moreMenu.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeMore);
    return () => document.removeEventListener("pointerdown", closeMore);
  }, []);

  // Papel es el valor predeterminado; nunca se usa el tema del sistema.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const savedTheme = localStorage.getItem("cambiometro-theme");
      const nextTheme: ThemeName = savedTheme === "dark" || savedTheme === "night" || savedTheme === "paper" ? savedTheme : "paper";
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.setAttribute("data-theme", nextTheme);
      setTheme(nextTheme);
      setHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Cerrar el drawer sólo después de una navegación real. Ejecutar un
  // setState diferido en el montaje competía con el primer click del botón
  // en el shell estático y podía devolver aria-expanded a false.
  useEffect(() => {
    // Durante la hidratación de un export estático usePathname puede ser null
    // antes de entregar la ruta real. No registres esa transición como una
    // navegación: si ocurre después del primer click, cerraría el drawer.
    if (!pathname) return;
    // En un export estático usePathname puede pasar de null al pathname
    // hidratado justo después del primer render. No cierres el drawer en esa
    // transición: puede ocurrir entre el click del botón y el commit del
    // estado y deja aria-expanded en false aunque el usuario sí lo abrió.
    if (!pathnameEffectReady.current) {
      pathnameEffectReady.current = true;
      previousPathname.current = pathname;
      return;
    }
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setDrawerOpen(false);
      moreMenu.current?.removeAttribute("open");
    }
  }, [pathname]);

  // Manejo de tecla Escape y bloqueo de scroll al abrir drawer
  useEffect(() => {
    const returnFocus = menuButton.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
      if (e.key === "Tab" && drawerOpen) {
        const targets = drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = targets?.[0];
        const last = targets?.[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      drawer.current?.querySelector<HTMLButtonElement>("button")?.focus();
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (drawerOpen) returnFocus?.focus();
    };
  }, [drawerOpen]);

  const toggleTheme = () => {
    const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("cambiometro-theme", nextTheme);
  };

  const themeLabels: Record<ThemeName, string> = { paper: "Papel", dark: "Oscuro", night: "Noche" };
  const nextTheme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const normalizedPath = normalizeSitePath(pathname ?? "/");
  const activeModule = activeModuleForPath(normalizedPath);
  const constructionActive = CONSTRUCTION_MODULES.some(
    (item) => normalizedPath === item.href || normalizedPath.startsWith(`${item.href}/`),
  );

  return (
    <>
      <header className="site-header" data-hydrated={hydrated ? "true" : undefined}>
        {/* ─── FILA 1: DESKTOP (≥1024px) / FILA ÚNICA MÓVIL (<1024px) ───────── */}
        <div className="container-main site-header__primary">
          <Link href="/" prefetch={false} className="site-brand" aria-label="El Cambiómetro, inicio">
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
            <a
              href="/donar"
              className="site-support-link"
              title="Conoce la misión del proyecto y cómo apoyar su independencia"
            >
              Apoyar Proyecto
            </a>

            {/* Toggle de tema (Touch target ≥ 44px en ambos breakpoints) */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Tema actual: ${themeLabels[theme]}. Cambiar a ${themeLabels[nextTheme]}`}
              title={`Tema: ${themeLabels[theme]} · siguiente: ${themeLabels[nextTheme]}`}
            >
              <Icono nombre={theme === "paper" ? "sun" : "moon"} size={18} />
              <span className="sr-only">{themeLabels[theme]}</span>
            </button>

            {/* Botón de Secciones (Solo visible en móvil <1024px, touch target ≥ 44px) */}
            <button
              type="button"
              className="site-menu-button"
              ref={menuButton}
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
            {ACTIVE_MODULES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="site-nav__link"
                aria-current={activeModule?.id === item.id ? "page" : undefined}
                title={item.fullLabel}
              >
                {item.label}
              </Link>
            ))}
            <details className="site-nav__more" ref={moreMenu} onKeyDown={(event) => {
              if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
            }}>
              <summary className="site-nav__link" aria-current={constructionActive ? "page" : undefined}>En construcción</summary>
              <div className="site-nav__more-panel">
                <strong>En construcción</strong>
                {CONSTRUCTION_MODULES.map((item) => (
                  <Link key={item.href} href={item.href} prefetch={false}>{item.label}</Link>
                ))}
              </div>
            </details>
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
        ref={drawer}
        className={`mobile-drawer${drawerOpen ? " is-open" : ""}`}
        style={{ display: drawerOpen ? "flex" : "none" }}
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
          <div className="mobile-drawer__cluster">
            <span className="mobile-drawer__cluster-title">Áreas activas</span>
            <ul className="mobile-drawer__list">
              {ACTIVE_MODULES.map((item) => {
                const isActive = activeModule?.id === item.id;
                return (
                  <li key={`m-${item.href}`}>
                    <Link href={item.href} prefetch={false} className={`mobile-drawer__link${isActive ? " is-active" : ""}`} aria-current={isActive ? "page" : undefined} onClick={() => setDrawerOpen(false)}>
                      <span>{item.fullLabel}</span>
                      {isActive && <Icono nombre="check" size={14} style={{ color: "var(--accent)" }} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mobile-drawer__cluster mobile-drawer__cluster--muted">
            <span className="mobile-drawer__cluster-title">En construcción</span>
            <ul className="mobile-drawer__list">
              {CONSTRUCTION_MODULES.map((item) => (
                <li key={`m-${item.href}`}>
                  <Link href={item.href} prefetch={false} className="mobile-drawer__link" onClick={() => setDrawerOpen(false)}>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="mobile-drawer__footer">
          {/* Enlaces de pie y Donación */}
          <div className="mobile-drawer__actions">
            <SourceLink
              href="https://www.instagram.com/cambiometro/"
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-social-link"
              aria-label="Seguir a @cambiometro en Instagram"
            >
              <span>Instagram @cambiometro</span>
            </SourceLink>
            <SourceLink
              href="https://x.com/cambiometro"
              target="_blank"
              rel="noopener noreferrer"
              className="drawer-social-link"
              aria-label="Seguir a @cambiometro en X"
            >
              <span>𝕏 @cambiometro</span>
            </SourceLink>
            <a
              href="/donar"
              className="btn btn-primary drawer-donate-btn"
              onClick={() => setDrawerOpen(false)}
            >
              Donar y apoyar
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
