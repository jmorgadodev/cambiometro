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

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <Skeleton width={48} height={48} borderRadius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={24} borderRadius={8} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Skeleton width="33%" height={14} />
        <Skeleton width="33%" height={14} />
        <Skeleton width="33%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-shell" style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`head-${i}`} width={`${100 / cols}%`} height={18} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.25rem 0" }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`cell-${r}-${c}`} width={`${100 / cols}%`} height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Ficha completa: header con avatar, stats y tabs (usada en /politico/[id], /municipalidades/[id], /servicios-publicos/[id])
export function SkeletonFicha() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.5rem 0" }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <Skeleton width={72} height={72} borderRadius={16} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <Skeleton width="40%" height={22} />
          <Skeleton width="60%" height={14} />
          <Skeleton width="30%" height={12} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px" }}>
            <Skeleton width="60%" height={12} />
            <Skeleton width="40%" height={20} />
          </div>
        ))}
      </div>
      <SkeletonTabs />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Skeleton width="100%" height={18} />
        <Skeleton width="100%" height={18} />
        <Skeleton width="80%" height={18} />
      </div>
    </div>
  );
}

// Listado con filtros y grilla (usado en /municipalidades, /servicios-publicos, /entidades, /partidos)
export function SkeletonListado({ cards = 6 }: { cards?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Skeleton width={280} height={40} borderRadius={8} />
        <Skeleton width={120} height={40} borderRadius={8} />
        <Skeleton width={120} height={40} borderRadius={8} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// Tabs + contenido (usado en fichas con pestañas)
export function SkeletonTabs() {
  return (
    <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} width={90} height={32} borderRadius={8} style={{ background: i === 0 ? "var(--border)" : undefined }} />
      ))}
    </div>
  );
}

// Compat: alias para listados genéricos
export const SkeletonList = SkeletonListado;
