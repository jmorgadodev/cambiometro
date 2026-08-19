"use client";

interface Props {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ScoreBadge({ score, size = "md", showLabel = true }: Props) {
  let color = "var(--ok)";
  let label = "Probidad Alta";
  let bg = "var(--ok-bg)";

  if (score < 40) {
    color = "var(--bad)";
    label = "Riesgo Alto";
    bg = "var(--bad-bg)";
  } else if (score < 60) {
    color = "var(--warn)";
    label = "Alerta Moderada";
    bg = "var(--warn-bg)";
  } else if (score < 75) {
    color = "var(--warn)";
    label = "Probidad Media";
    bg = "var(--warn-bg)";
  }

  const dimensions = {
    sm: { font: "0.9rem", box: "28px", padding: "0.15rem 0.5rem" },
    md: { font: "1.25rem", box: "42px", padding: "0.25rem 0.75rem" },
    lg: { font: "2rem", box: "64px", padding: "0.5rem 1.25rem" },
  }[size];

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontWeight: 800,
          fontSize: dimensions.font,
          color,
          background: bg,
          border: `1px solid ${color}`,
          padding: dimensions.padding,
          borderRadius: 8,
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {score}
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: size === "sm" ? "0.7rem" : "0.8rem",
            fontWeight: 600,
            color,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
