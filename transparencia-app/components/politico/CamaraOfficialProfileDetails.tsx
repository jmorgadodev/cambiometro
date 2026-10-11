import type { ReactNode } from "react";
import type { FichaCamara } from "@/lib/personal-apoyo";

const missing = "No informado en el dato incorporado";
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

  return (
    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "0.65rem 1rem", margin: 0, fontSize: "0.82rem" }}>
      <ProfileField label="Comunas del distrito">{ficha.comunas_distrito || missing}</ProfileField>
      <ProfileField label="Distrito">{ficha.numero_distrito ? String(ficha.numero_distrito) : missing}</ProfileField>
      <ProfileField label="Región">{ficha.region || missing}</ProfileField>
      <ProfileField label="Período vigente">{ficha.periodo || missing}</ProfileField>
      <ProfileField label="Partido publicado por Cámara">
        {ficha.partido || missing}{ficha.partido_fuente && <> · <a href={ficha.partido_fuente} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a></>}
      </ProfileField>
      <ProfileField label="Bancada">{ficha.bancada || missing}</ProfileField>
      <ProfileField label="Períodos parlamentarios publicados">{ficha.periodos?.length ? ficha.periodos.join(" · ") : missing}</ProfileField>
      <ProfileField label="Contacto oficial">
        {ficha.telefono || ficha.email ? (
          <span style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {ficha.telefono && <a href={`tel:${ficha.telefono.replace(/[^+\d]/g, "")}`}>Teléfono: {ficha.telefono}</a>}
            {ficha.email && <a href={`mailto:${ficha.email}`}>Correo: {ficha.email}</a>}
          </span>
        ) : missing}
      </ProfileField>
      <ProfileField label="Sitio web y redes publicados por Cámara">
        {links.length ? (
          <span style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {links.map(({ label, url }) => <a key={`${label}-${url}`} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}
          </span>
        ) : missing}
      </ProfileField>
      {ficha.perfil_fuente && <div style={{ gridColumn: "1 / -1", color: "var(--text-muted)", fontSize: "0.7rem" }}>
        Ficha oficial de Cámara{ficha.perfil_verificado_en ? ` · consultada ${ficha.perfil_verificado_en}` : ""}: <a href={ficha.perfil_fuente} target="_blank" rel="noopener noreferrer">ver fuente ↗</a>
      </div>}
    </dl>
  );
}
