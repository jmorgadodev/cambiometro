import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({
  className = "",
  width,
  height,
  borderRadius = 6,
  style = {},
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonCard({ height = 180 }: { height?: number | string }) {
  return (
    <div
      className="card-flat"
      style={{
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        minHeight: typeof height === "number" ? `${height}px` : height,
      }}
      aria-hidden="true"
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Skeleton width={44} height={44} borderRadius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Skeleton width="55%" height={16} borderRadius={4} />
          <Skeleton width="35%" height={12} borderRadius={4} />
        </div>
      </div>
      <Skeleton width="100%" height={20} borderRadius={6} />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
        <Skeleton width="30%" height={14} borderRadius={4} />
        <Skeleton width="30%" height={14} borderRadius={4} />
        <Skeleton width="30%" height={14} borderRadius={4} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-shell" style={{ width: "100%" }} aria-hidden="true">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
        {/* Fila encabezado */}
        <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`head-${i}`} width={`${100 / cols}%`} height={16} borderRadius={4} />
          ))}
        </div>
        {/* Filas cuerpo */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.4rem 0" }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} width={`${100 / cols}%`} height={14} borderRadius={4} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTabs({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={`tab-${i}`} width={i === 0 ? 110 : 90} height={32} borderRadius={6} />
      ))}
    </div>
  );
}

export function PoliticoFichaSkeleton() {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true" aria-label="Cargando perfil parlamentario">
      {/* Header masthead */}
      <section className="page-masthead">
        <div className="container-main">
          {/* Breadcrumbs & share */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <Skeleton width={200} height={16} borderRadius={4} />
            <Skeleton width={110} height={34} borderRadius={6} />
          </div>

          <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <Skeleton width={96} height={96} borderRadius="50%" />
            <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Skeleton width={70} height={20} borderRadius={4} />
                <Skeleton width={90} height={20} borderRadius={4} />
              </div>
              <Skeleton width="60%" height={32} borderRadius={6} />
              <Skeleton width="45%" height={16} borderRadius={4} />
            </div>
            {/* Score box */}
            <div style={{ width: 140, display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-end" }}>
              <Skeleton width={110} height={40} borderRadius={8} />
              <Skeleton width={80} height={12} borderRadius={4} />
            </div>
          </div>

          {/* Quick stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`stat-${i}`}
                className="card-flat"
                style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}
              >
                <Skeleton width="50%" height={12} borderRadius={4} />
                <Skeleton width="80%" height={22} borderRadius={4} />
                <Skeleton width="60%" height={12} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main body content */}
      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div className="politico-layout">
          {/* Columna Izquierda */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
            <SkeletonCard height={140} />
            <div className="card-flat" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Skeleton width={180} height={20} borderRadius={4} />
                <Skeleton width={100} height={28} borderRadius={6} />
              </div>
              <SkeletonTable rows={4} cols={3} />
            </div>
            <SkeletonCard height={200} />
          </div>

          {/* Columna Derecha */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
            <div className="card-flat" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Skeleton width={220} height={22} borderRadius={4} />
              <SkeletonTabs count={4} />
              <SkeletonTable rows={6} cols={4} />
            </div>
            <SkeletonCard height={160} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MunicipalidadFichaSkeleton() {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true" aria-label="Cargando ficha municipal">
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <Skeleton width={220} height={16} borderRadius={4} />
            <Skeleton width={110} height={34} borderRadius={6} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <Skeleton width={100} height={22} borderRadius={4} />
            <Skeleton width="50%" height={34} borderRadius={6} />
            <Skeleton width="30%" height={16} borderRadius={4} />
          </div>

          {/* 7 Capas de métricas clave */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`kpi-${i}`}
                className="card-flat"
                style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}
              >
                <Skeleton width="60%" height={12} borderRadius={4} />
                <Skeleton width="85%" height={24} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <SkeletonTabs count={3} />
          <SkeletonTable rows={8} cols={5} />
        </div>
      </div>
    </div>
  );
}

export function ServicioPublicoFichaSkeleton() {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true" aria-label="Cargando servicio público">
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <Skeleton width={240} height={16} borderRadius={4} />
            <Skeleton width={110} height={34} borderRadius={6} />
          </div>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            <Skeleton width={80} height={80} borderRadius={16} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <Skeleton width={120} height={20} borderRadius={4} />
              <Skeleton width="60%" height={32} borderRadius={6} />
              <Skeleton width="40%" height={16} borderRadius={4} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`serv-kpi-${i}`}
                className="card-flat"
                style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <Skeleton width="50%" height={14} borderRadius={4} />
                <Skeleton width="75%" height={26} borderRadius={4} />
                <Skeleton width="60%" height={12} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <SkeletonTabs count={3} />
          <SkeletonTable rows={7} cols={4} />
        </div>
      </div>
    </div>
  );
}

export function EntityFichaSkeleton() {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true" aria-label="Cargando ficha de entidad">
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <Skeleton width={180} height={16} borderRadius={4} />
            <Skeleton width={110} height={34} borderRadius={6} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Skeleton width={80} height={20} borderRadius={4} />
              <Skeleton width={100} height={20} borderRadius={4} />
            </div>
            <Skeleton width="55%" height={32} borderRadius={6} />
            <Skeleton width="35%" height={16} borderRadius={4} />
          </div>
        </div>
      </section>

      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <SkeletonTabs count={4} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
          </div>
          <SkeletonTable rows={6} cols={4} />
        </div>
      </div>
    </div>
  );
}

export function ListadoSkeleton({
  title = "Cargando directorio...",
  cardsCount = 6,
}: {
  title?: string;
  cardsCount?: number;
}) {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true" aria-label={title}>
      <section className="page-masthead">
        <div className="container-main">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <Skeleton width="35%" height={32} borderRadius={6} />
            <Skeleton width="55%" height={16} borderRadius={4} />
          </div>
          {/* Buscador y filtros */}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <Skeleton width="100%" height={44} borderRadius={8} style={{ maxWidth: 460 }} />
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Skeleton width={80} height={36} borderRadius={6} />
              <Skeleton width={90} height={36} borderRadius={6} />
              <Skeleton width={85} height={36} borderRadius={6} />
            </div>
          </div>
        </div>
      </section>

      <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {Array.from({ length: cardsCount }).map((_, i) => (
            <SkeletonCard key={`card-${i}`} height={170} />
          ))}
        </div>
      </div>
    </div>
  );
}
