"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Keep the error detail out of the rendered page; it can contain implementation data.
  return (
    <main className="container-main error-boundary" role="alert">
      <div aria-hidden="true" className="error-boundary__icon">⚠️</div>
      <h1 className="error-boundary__title">
        No pudimos cargar esta sección
      </h1>
      <p className="error-boundary__message">
        Ocurrió un error temporal al mostrar los datos. Puedes reintentar o volver al inicio; no se perdió la información publicada.
      </p>
      <div className="error-boundary__actions">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Reintentar
        </button>
        <Link prefetch={false} href="/" className="btn btn-secondary">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
