import React from "react";

interface LoadingOrbProps {
  size?: number;
  className?: string;
  label?: string;
  inline?: boolean;
}

export default function LoadingOrb({
  size = 56,
  className = "",
  label = "Cargando contenido...",
  inline = false,
}: LoadingOrbProps) {
  const containerStyle: React.CSSProperties = inline
    ? { display: "inline-flex", alignItems: "center", justifyContent: "center" }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 0",
        gap: "0.85rem",
      };

  return (
    <div
      className={`loading-orb-container ${className}`}
      style={containerStyle}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="loading-orb"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="loading-orb__glow" aria-hidden="true" />
        <div className="loading-orb__ring" aria-hidden="true" />
        <div className="loading-orb__core" aria-hidden="true" />
      </div>
      {!inline && label && (
        <span
          className="loading-orb__label"
          style={{
            fontSize: "0.78rem",
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
