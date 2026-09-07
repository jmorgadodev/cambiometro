import Link from "next/link";
import type { CoverageMetric, DataQualityStatus } from "@/lib/data-quality-summary";
import {
  formatReleaseTimestamp,
  RELEASE_STATUS_LABELS,
  RELEASE_STATUS_TONES,
  shortReleaseChecksum,
} from "@/lib/release-meta";

interface Props {
  eyebrow?: string;
  title: string;
  source: string;
  period: string | null | undefined;
  lastSuccessAt: string | null | undefined;
  status: DataQualityStatus;
  published: CoverageMetric;
  queryable: CoverageMetric;
  related?: CoverageMetric;
  checksumSha256?: string | null;
  href: string;
  officialUrl?: string;
  note?: string;
}

function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? "No calculable" : value.toLocaleString("es-CL");
}

function toneColor(tone: "ok" | "warn" | "danger" | "muted"): string {
  if (tone === "ok") return "var(--ok)";
  if (tone === "warn") return "var(--warn)";
  if (tone === "danger") return "var(--danger)";
  return "var(--text-muted)";
}

export default function ReleaseMetaCard({
  eyebrow = "Trazabilidad del release",
  title,
  source,
  period,
  lastSuccessAt,
  status,
  published,
  queryable,
  related,
  checksumSha256,
  href,
  officialUrl,
  note,
}: Props) {
  const tone = RELEASE_STATUS_TONES[status];

  return (
    <section className="card" aria-labelledby={`${title}-release-title`} style={{ padding: "1.1rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: "0.25rem" }}>{eyebrow}</div>
          <h2 id={`${title}-release-title`} style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-1)" }}>{title}</h2>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.78rem" }}>
            Fuente: <strong style={{ color: "var(--text-1)" }}>{source}</strong>
            {period ? <> · período {period}</> : null}
          </p>
        </div>
        <span className={`badge badge-${tone === "muted" ? "subtle" : tone}`} aria-label={`Estado del release: ${RELEASE_STATUS_LABELS[status]}`}>
          {RELEASE_STATUS_LABELS[status]}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.65rem", marginTop: "0.9rem" }}>
        {[
          ["Publicado", published.count],
          ["Consultable", queryable.count],
          ["Relacionado", related?.count ?? null],
        ].map(([label, count]) => (
          <div key={String(label)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
            <strong style={{ display: "block", marginTop: "0.18rem", color: "var(--text-1)", fontFamily: "monospace" }}>{formatCount(count as number | null)}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.25rem", marginTop: "0.8rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
        <span>Última publicación: <strong style={{ color: "var(--text-1)" }}>{formatReleaseTimestamp(lastSuccessAt)}</strong></span>
        <span>Checksum: <code style={{ color: toneColor(tone) }}>{shortReleaseChecksum(checksumSha256)}</code></span>
      </div>
      {note ? <p style={{ margin: "0.7rem 0 0", color: "var(--text-muted)", fontSize: "0.76rem", lineHeight: 1.5 }}>{note}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", marginTop: "0.85rem" }}>
        <Link prefetch={false} href={href} className="btn btn-secondary" style={{ fontSize: "0.76rem" }}>Explorar registros</Link>
        {officialUrl ? <a href={officialUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: "0.76rem" }}>Fuente oficial ↗</a> : null}
      </div>
    </section>
  );
}
