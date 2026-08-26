import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-main" style={{ padding: "5rem 1.5rem", textAlign: "center", minHeight: "70vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
        Página no encontrada
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 500, margin: "0 auto 2rem", lineHeight: 1.6 }}>
        El registro, autoridad o servicio que buscas no está disponible o ha sido reubicado en la plataforma.
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link prefetch={false} href="/" className="btn btn-primary">
          Ir al Inicio
        </Link>
        <Link prefetch={false} href="/politico" className="btn btn-secondary">
          Explorar Autoridades
        </Link>
      </div>
    </main>
  );
}
