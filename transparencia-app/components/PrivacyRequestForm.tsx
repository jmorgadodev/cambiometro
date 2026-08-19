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
        "error-callback": () => setToken(null),
      });
      widgetIdRef.current = id;
    };

    if (window.turnstile) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.addEventListener("load", init);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", init);
      const id = widgetIdRef.current;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

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

    if (!token) {
      setErrorMessage("Completa el desafío de verificación para enviar la solicitud.");
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
      const payload = (await response.json()) as { error?: { message?: string }; data?: { id: number; estado: string } };
      if (!response.ok || !payload.data) {
        setErrorMessage(payload.error?.message ?? "No fue posible enviar la solicitud. Intenta nuevamente.");
        resetWidget();
        setState("error");
        return;
      }
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
      <div className="card" role="status" style={{ padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>Solicitud recibida</h3>
        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Registramos tu solicitud y responderemos por correo dentro del plazo legal (hasta 10 días hábiles,
          prorrogable por otros 10 cuando el tratamiento lo justifique). Si no recibes respuesta, escribe a
          <a href="mailto:datos@cambiometro.impulsacv.cl"> datos@cambiometro.impulsacv.cl</a>.
        </p>
      </div>
    );
  }

  return (
    <form id="form-solicitud" onSubmit={handleSubmit} noValidate>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
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

      <label className="form-field" style={{ display: "block", marginTop: "1rem" }}>
        <span className="form-field__label">Correo electrónico *</span>
        <input name="email" type="email" required maxLength={120} autoComplete="email" aria-label="Correo electrónico" />
      </label>

      <label className="form-field" style={{ display: "block", marginTop: "1rem" }}>
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
        <div ref={turnstileRef} className="cf-turnstile-placeholder" style={{ marginTop: "1rem" }} aria-label="Verificación anti-bots" />
      ) : (
        <p style={{ fontSize: "0.78rem", color: "var(--text-subtle)" }}>
          La verificación anti-bots está desactivada temporalmente.
        </p>
      )}

      {state === "error" && errorMessage && (
        <p role="alert" style={{ fontSize: "0.85rem", color: "var(--danger)", margin: "0.75rem 0 0" }}>
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={state === "sending"}
        style={{ marginTop: "1rem" }}
      >
        {state === "sending" ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}