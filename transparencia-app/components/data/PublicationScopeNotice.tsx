import Link from "next/link";
import { PUBLICATION_SCOPES, PUBLICATION_STATE_LABELS, type IndicatorPublicationState, type PublicationScopeArea } from "@/lib/publication-scope";

export default function PublicationScopeNotice({ area, state = "cobertura_limitada" }: { area: PublicationScopeArea; state?: IndicatorPublicationState }) {
  return <aside className="container-main" aria-label="Alcance de la información" style={{ paddingTop: "0.75rem", paddingBottom: "0.75rem", color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.6 }}>
    <strong style={{ color: "var(--text-1)" }}>{PUBLICATION_STATE_LABELS[state]}.</strong>{" "}
    {PUBLICATION_SCOPES[area]}{" "}<Link prefetch={false} href="/como-funciona#alcance-publicacion">Cómo interpretar los datos</Link>.
  </aside>;
}
