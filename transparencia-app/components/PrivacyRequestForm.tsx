"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const REQUEST_TYPES = [
  { value: "acceso", label: "Acceso a mis datos" },
  { value: "rectificacion", label: "Rectificación de datos" },
  { value: "cancelacion", label: "Cancelación (eliminación) de datos" },
  { value: "oposicion", label: "Oposición al tratamiento" },
  { value: "informacion", label: "Información sobre el tratamiento" },
  { value: "otro", label: "Otro" },
];

type SubmitState = "idle" | "sending" | "success" | "error";

export default function PrivacyRequestForm({ siteKey = "" }: { siteKey?: string }) {
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<"enviada" | "pendiente">("enviada");

  useEffect(() => {
    if (!siteKey || typeof window === "undefined") return;
    const container = turnstileRef.current;
    if (!container) return;

    const init = () => {
      if (!window.turnstile || container.dataset.rendered === "1") return;
      container.dataset.rendered = "1";
      const id = window.turnstile.render(container, {
        sitekey: siteKey,
        theme: "light",
        callback: (value: string) => setToken(value),
        "expired-callback": () => setToken(null),
        "error-callback": () => {
          setToken(null);
          setErrorMessage("No fue posible cargar la verificación. Recarga la página e intenta nuevamente.");
          setState("error");
        },
      });
      widgetIdRef.current = id;
    };

    let script: HTMLScriptElement | null = null;
    if (window.turnstile) init();
    else {
      script = document.createElement("script");
      script.async = true;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.addEventListener("load", init);
      document.head.appendChild(script);
    }

    return () => {
      script?.removeEventListener("load", init);
      const id = widgetIdRef.current;
      if (id && window.turnstile) window.turnstile.remove(id);
      widgetIdRef.current = null;
      delete container.dataset.rendered;
    };
  }, [siteKey]);

  const resetWidget = () => {
    setToken(null);
    const id = widgetIdRef.current;
    if (id && window.turnstile) window.turnstile.reset(id);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const descripcion = String(values.get("descripcion") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const tipo = String(values.get("tipo") ?? "");

    if (!siteKey) {
      setErrorMessage("El canal de verificación no está disponible. Recarga la página o intenta más tarde.");
      setState("error");
      return;
    }
    if (!token) {
      setErrorMessage("Completa el desafío de verificación para enviar la solicitud.");
      setState("error");
      return;
    }
    if (!REQUEST_TYPES.some((option) => option.value === tipo)) {
      setErrorMessage("Selecciona el tipo de solicitud.");
      setState("error");
      return;
    }
    if (descripcion.length < 10) {
      setErrorMessage("Describe tu solicitud con al menos 10 caracteres.");
      setState("error");
      return;
    }
    if (!/^[^@\s]{1,120}@[^@\s]{1,120}\.[a-zA-Z]{2,}$/.test(email)) {
      setErrorMessage("Ingresa un correo electrónico válido para recibir la respuesta.");
      setState("error");
      return;
    }

    setState("sending");
    setErrorMessage("");
    try {
      const response = await fetch("/api/v1/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          nombre: String(values.get("nombre") ?? "").trim(),
          email,
          descripcion,
          website: String(values.get("website") ?? ""),
          turnstileToken: token,
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string }; data?: { id: number; estado: string; notificacion?: "enviada" | "pendiente" } };
      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error?.message ?? "No fue posible enviar la solicitud. Intenta nuevamente.");
        resetWidget();
        setState("error");
        return;
      }
      setNotificationStatus(payload.data.notificacion ?? "enviada");
      setState("success");
      form.reset();
      resetWidget();
    } catch {
      resetWidget();
      setErrorMessage("Error de conexión. Intenta nuevamente en unos segundos.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="privacy-request-form__success" role="status">
        <h3>Solicitud recibida</h3>
        <p>
          Registramos tu solicitud y responderemos por correo dentro del plazo legal (hasta 10 días hábiles,
          prorrogable por otros 10 cuando el tratamiento lo justifique). {notificationStatus === "pendiente" ? "La notificación interna quedó pendiente, pero la solicitud fue guardada correctamente. " : "La notificación interna fue enviada correctamente. "}Si no recibes respuesta, escribe a
          <a href="mailto:datos@cambiometro.impulsacv.cl"> datos@cambiometro.impulsacv.cl</a>.
        </p>
      </div>
    );
  }

  return (
    <form id="form-solicitud" className="privacy-request-form" onSubmit={handleSubmit} noValidate>
      <div className="privacy-request-form__grid">
        <label className="form-field">
          <span className="form-field__label">Tipo de solicitud *</span>
          <select name="tipo" defaultValue="" required aria-label="Tipo de solicitud">
            <option value="" disabled>Selecciona el tipo</option>
            {REQUEST_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span className="form-field__label">Nombre (opcional)</span>
          <input name="nombre" type="text" maxLength={120} autoComplete="name" aria-label="Nombre" />
        </label>
      </div>

      <label className="form-field">
        <span className="form-field__label">Correo electrónico *</span>
        <input name="email" type="email" required maxLength={120} autoComplete="email" aria-label="Correo electrónico" />
      </label>

      <label className="form-field">
        <span className="form-field__label">Describe tu solicitud *</span>
        <textarea
          name="descripcion"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          aria-label="Descripción de la solicitud"
          placeholder="Indica qué datos, fuente o registro quieres consultar, rectificar o eliminar."
        />
      </label>

      <div style={{ display: "none" }} aria-hidden="true">
        <label htmlFor="website-field">No completar este campo</label>
        <input id="website-field" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {siteKey ? (
        <div className="privacy-request-form__turnstile">
          <p>Completa el desafío de verificación para enviar la solicitud.</p>
          <div ref={turnstileRef} className="cf-turnstile-placeholder" aria-label="Verificación anti-bots" />
        </div>
      ) : (
        <p className="privacy-request-form__unavailable" role="alert">
          El formulario está temporalmente fuera de servicio porque la verificación anti-bots no está configurada.
        </p>
      )}

      {state === "error" && errorMessage && (
        <p role="alert" className="privacy-request-form__error">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={state === "sending" || !siteKey}
      >
        {state === "sending" ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
