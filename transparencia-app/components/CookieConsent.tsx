"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __cambiometroTracking?: { mode: "ga4" | "gtm"; id: string };
  }
}

const CONSENT_KEY = "cambiometro-consent";
const CONSENT_OPEN_EVENT = "cambiometro:open-consent-preferences";
const CONSENT_CHANGED_EVENT = "cambiometro:consent-changed";

export type ConsentChoice = "granted" | "denied";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim();
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID?.trim();

const CONSENT_VALUES = (value: "granted" | "denied") => ({
  ad_storage: value,
  ad_user_data: value,
  ad_personalization: value,
  analytics_storage: value,
});

function ensureDataLayer() {
  if (typeof window === "undefined") return null;
  if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
  return window.dataLayer;
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    return null;
  }
}

function storeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  } catch {
    // Almacenamiento no disponible: el banner permanece visible.
  }
}

function subscribeConsent(onChange: () => void) {
  const storageHandler = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY) onChange();
  };
  const changedHandler = () => onChange();
  window.addEventListener("storage", storageHandler);
  window.addEventListener(CONSENT_CHANGED_EVENT, changedHandler);
  return () => {
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener(CONSENT_CHANGED_EVENT, changedHandler);
  };
}

/**
 * Carga la integración elegida solo cuando existe un ID configurado y el usuario otorgó
 * consentimiento. El script se inyecta con document.createElement: nunca
 * aparece en el HTML servido por el servidor (default = rechazado).
 */
function loadTracking() {
  if (typeof window === "undefined" || window.__cambiometroTracking) return;
  const mode = GTM_ID ? "gtm" : GA4_ID ? "ga4" : null;
  const id = GTM_ID ?? GA4_ID;
  if (!mode || !id || !/^(?:GTM|G)-[A-Z0-9_-]+$/i.test(id)) return;

  const dataLayer = ensureDataLayer();
  if (!dataLayer || !window.gtag) return;
  window.gtag("consent", "default", { ...CONSENT_VALUES("denied"), wait_for_update: 500 });

  const script = document.createElement("script");
  script.async = true;
  script.src = mode === "gtm"
    ? `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
    : `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.setAttribute("data-consent", "granted");
  script.setAttribute("data-cambiometro-tracker", mode);
  document.head.appendChild(script);
  window.__cambiometroTracking = { mode, id };

  window.gtag("consent", "update", CONSENT_VALUES("granted"));
  if (mode === "gtm") {
    window.dataLayer?.push({ "gtm.start": Date.now(), event: "gtm.js" });
  }
  if (mode === "ga4") {
    window.gtag("js", new Date());
    // Los page_view se envían manualmente para cubrir navegación cliente sin duplicados.
    window.gtag("config", id, { anonymize_ip: true, send_page_view: false });
  }
}

function updateGtagConsent(choice: ConsentChoice) {
  if (typeof window === "undefined" || !window.gtag) return;
  const value = choice === "granted" ? "granted" : "denied";
  window.gtag("consent", "update", CONSENT_VALUES(value));
  window.dataLayer?.push({ event: "cambiometro_consent_update", ...CONSENT_VALUES(value) });
}

function trackPageView(pathname: string) {
  if (typeof window === "undefined" || !window.__cambiometroTracking) return;
  const payload = {
    page_title: document.title,
    page_location: window.location.href,
    page_path: pathname,
  };
  if (window.__cambiometroTracking.mode === "ga4") {
    window.gtag?.("event", "page_view", payload);
  } else {
    // El contenedor GTM debe tener una etiqueta GA4 activada por este evento.
    window.dataLayer?.push({ event: "cambiometro_page_view", ...payload });
  }
}

export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readStoredConsent, () => "denied");
  const [reopened, setReopened] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (consent === "granted") loadTracking();
  }, [consent]);

  useEffect(() => {
    if (consent === "granted" && pathname) trackPageView(pathname);
  }, [consent, pathname]);

  const choose = (choice: ConsentChoice) => {
    storeConsent(choice);
    updateGtagConsent(choice);
    // En el export estático no dependemos únicamente del siguiente render de
    // React para cargar la medición: el consentimiento explícito del usuario
    // es el punto seguro para insertar el tracker.
    if (choice === "granted") loadTracking();
    setReopened(false);
  };

  const visible = reopened || consent === null;

  return (
    <div className={`cookie-consent${visible ? " cookie-consent--visible" : ""}`} role="region" aria-label="Preferencias de cookies" hidden={!visible}>
      <div className="cookie-consent__content">
        <p className="cookie-consent__title">Tu privacidad importa</p>
        <p className="cookie-consent__text">
          Usamos cookies solo con tu permiso y únicamente para estadísticas anónimas de visitas.
          Sin tu consentimiento no se cargan herramientas de medición. Conoce más en{" "}
          <a href="/privacidad">Política de Privacidad</a>.
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="btn btn-primary" onClick={() => choose("granted")}>
            Aceptar
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => choose("denied")}>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

export function openCookieConsentPreferences() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

export function CookiePreferencesButton({ className = "site-footer__link" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={openCookieConsentPreferences}
    >
      Preferencias de cookies
    </button>
  );
}
