import type { ReactNode } from "react";
import type { FichaCamara } from "@/lib/personal-apoyo";

const fieldStyle = { color: "var(--text-muted)" } as const;
const valueStyle = { margin: "0.15rem 0 0", color: "var(--text-primary)" } as const;

function ProfileField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt style={fieldStyle}>{label}</dt><dd style={valueStyle}>{children}</dd></div>;
}

export function CamaraOfficialProfileDetails({ ficha }: { ficha: FichaCamara }) {
  const notReported = "No informado en el dato incorporado";
  const networks = Object.entries(ficha.redes ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
  const links = [
    ...(ficha.enlaces_publicos ?? []),
    ...(ficha.sitio_web ? [{ label: "Sitio web", url: ficha.sitio_web }] : []),
    ...networks.map(([network, url]) => ({ label: network === "x" ? "X" : network === "facebook" ? "Facebook" : "Instagram", url })),
  ].filter((link, index, all) => all.findIndex((candidate) => candidate.url === link.url) === index);

  const fields = [
    { label: "Comunas del distrito", value: ficha.comunas_distrito || notReported },
    { label: "Distrito", value: ficha.numero_distrito == null ? notReported : `N.º ${ficha.numero_distrito}` },
    { label: "Región", value: ficha.region || notReported },
    { label: "Período vigente", value: ficha.periodo || notReported },
    { label: "Partido publicado por Cámara", value: ficha.partido ? <>{ficha.partido}{ficha.partido_fuente && <> · <a href={ficha.partido_fuente} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a></>}</> : notReported },
    { label: "Bancada", value: ficha.bancada || notReported },
    { label: "Períodos parlamentarios publicados", value: ficha.periodos?.length ? ficha.periodos.join(" · ") : notReported },
    { label: "Contacto oficial", value: ficha.telefono || ficha.email ? <span style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      {ficha.telefono && <span>Teléfono: <a href={`tel:${ficha.telefono.replace(/[^+\d]/g, "")}`}>{ficha.telefono}</a></span>}
      {ficha.email && <span>Correo: <a href={`mailto:${ficha.email}`}>{ficha.email}</a></span>}
    </span> : notReported },
    { label: "Sitio web y redes publicados por Cámara", value: links.length ? <span style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      {links.map(({ label, url }) => <a key={`${label}-${url}`} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}
    </span> : notReported },
  ];

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
