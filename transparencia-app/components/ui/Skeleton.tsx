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
    <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
    <div className="table-shell" style={{ width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem" }}>
        {/* Header row */}
        <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`head-${i}`} width={`${100 / cols}%`} height={18} />
          ))}
        </div>
        {/* Body rows */}
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
