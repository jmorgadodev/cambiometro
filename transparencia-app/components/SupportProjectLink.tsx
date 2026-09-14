import type React from "react";

const MERCADO_PAGO_URL = "https://link.mercadopago.cl/impulsacv";

export function SupportProjectLink({ className = "", children = "☕ Apoyar Proyecto" }: { className?: string; children?: React.ReactNode }) {
  return (
    <a
      href={MERCADO_PAGO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="Haz un aporte voluntario para mantener los servidores y la fiscalización independiente"
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
      <SupportProjectLink className="support-project-banner__link">Realizar un aporte ↗</SupportProjectLink>
    </aside>
  );
}
