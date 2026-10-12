import type { ReactNode } from "react";
import type { FichaCamara } from "@/lib/personal-apoyo";

const fieldStyle = { color: "var(--text-muted)" } as const;
const valueStyle = { margin: "0.15rem 0 0", color: "var(--text-primary)" } as const;

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt style={fieldStyle}>{label}</dt><dd style={valueStyle}>{children}</dd></div>;
}

export function CamaraOfficialProfileDetails({ ficha }: { ficha: FichaCamara }) {
  const networks = Object.entries(ficha.redes ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const links = [
    ...(ficha.enlaces_publicos ?? []),
    ...(ficha.sitio_web ? [{ label: "Sitio web", url: ficha.sitio_web }] : []),
    ...networks.map(([network, url]) => ({ label: network === "x" ? "X" : network === "facebook" ? "Facebook" : "Instagram", url })),
  ].filter((link, index, all) => all.findIndex((candidate) => candidate.url === link.url) === index);

  const fields = [
    ficha.comunas_distrito ? { label: "Comunas", value: ficha.comunas_distrito } : null,
    ficha.partido ? { label: "Partido según Cámara", value: <>{ficha.partido}{ficha.partido_fuente && <> · <a href={ficha.partido_fuente} target="_blank" rel="noopener noreferrer">fuente ↗</a></>}</> } : null,
    ficha.bancada ? { label: "Bancada", value: ficha.bancada } : null,
    ficha.periodos?.length ? { label: "Períodos parlamentarios", value: ficha.periodos.join(" · ") } : null,
    ficha.telefono || ficha.email ? { label: "Contacto", value: <span style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      {ficha.telefono && <a href={`tel:${ficha.telefono.replace(/[^+\d]/g, "")}`}>{ficha.telefono}</a>}
      {ficha.email && <a href={`mailto:${ficha.email}`}>{ficha.email}</a>}
    </span> } : null,
    links.length ? { label: "Web y redes", value: <span style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      {links.map(({ label, url }) => <a key={`${label}-${url}`} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}
    </span> } : null,
  ].filter((field): field is NonNullable<typeof field> => Boolean(field));

  if (!fields.length && !ficha.perfil_fuente) return null;

  return (
    <div aria-label="Datos complementarios publicados por la Cámara" style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "0.75rem", paddingTop: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Datos complementarios de Cámara</span>
        {ficha.perfil_fuente && <a href={ficha.perfil_fuente} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: "0.68rem" }}>
          Fuente oficial{ficha.perfil_verificado_en ? ` · ${ficha.perfil_verificado_en}` : ""} ↗
        </a>}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "0.55rem 0.85rem", margin: 0, fontSize: "0.75rem" }}>
        {fields.map(({ label, value }) => <ProfileField key={label} label={label}>{value}</ProfileField>)}
      </dl>
    </div>
  );
}
