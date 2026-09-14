import type React from "react";

export const MERCADO_PAGO_URL = "https://link.mercadopago.cl/impulsacv";

export function SupportProjectLink({ className = "", children = "Apoyar Proyecto" }: { className?: string; children?: React.ReactNode }) {
  return (
    <a
      href="/donar"
      className={className}
      title="Conoce la misión del proyecto y cómo apoyar su independencia"
    >
      {children}
    </a>
  );
}

export function SupportProjectBanner() {
  return (
    <aside className="support-project-banner" aria-label="Apoyar El Cambiómetro">
      <div>
        <strong>¿Te fue útil esta auditoría pública?</strong>
        <p>Apoya el desarrollo de esta herramienta independiente.</p>
      </div>
      <SupportProjectLink className="support-project-banner__link">Conoce cómo apoyar →</SupportProjectLink>
    </aside>
  );
}
