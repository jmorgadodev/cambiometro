"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CONSENT_KEY = "cambiometro-consent";
const CONSENT_OPEN_EVENT = "cambiometro:open-consent-preferences";
const CONSENT_CHANGED_EVENT = "cambiometro:consent-changed";

export type ConsentChoice = "granted" | "denied";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim();

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
 * Carga gtag.js solo cuando existe GA4_ID configurado y el usuario otorgó
 * consentimiento. El script se inyecta con document.createElement: nunca
 * aparece en el HTML servido por el servidor (default = rechazado).
 */
function loadGtag() {
  const id = GA4_ID;
  if (!id || typeof window === "undefined" || window.dataLayer) return;

  const dataLayer: unknown[] = [];
  Object.defineProperty(window, "dataLayer", { configurable: true, value: dataLayer });
  window.gtag = function gtag(...args: unknown[]) {
    dataLayer.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.setAttribute("data-consent", "granted");
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
}

export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readStoredConsent, () => "denied");
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const reopen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (consent === "granted") loadGtag();
  }, [consent]);

  const choose = (choice: ConsentChoice) => {
    storeConsent(choice);
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