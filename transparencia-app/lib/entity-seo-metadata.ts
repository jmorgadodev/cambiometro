import type { Metadata } from "next";
import type { CanonicalEntity } from "@/lib/data-contracts";
import { publicLegalRutValue } from "@/lib/public-legal-rut";

function compactRut(value: string) {
  return value.replace(/[^0-9k]/gi, "").toUpperCase();
}

function formatRut(value: string) {
  const compact = compactRut(value);
  const body = compact.slice(0, -1);
  const groupedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${groupedBody}-${compact.at(-1)}`;
}

export function getPublicLegalRut(entity: CanonicalEntity): string | null {
  if (entity.kind === "person") return null;
  const value = entity.identifiers
    .map(publicLegalRutValue)
    .find((candidate): candidate is string => candidate !== null);
  return value ? formatRut(value) : null;
}

export function createEntitySeoMetadata(entity: CanonicalEntity): Metadata {
  const rut = getPublicLegalRut(entity);
  const isCommercialEntity = entity.kind === "supplier" || entity.kind === "legal_entity";
  const title = rut
    ? `${entity.name} — RUT ${rut} | El Cambiómetro`
    : `${entity.name}: ficha pública | El Cambiómetro`;
  const description = rut
    ? isCommercialEntity
      ? `Consulta contratos, licitaciones y registros públicos de ${entity.name}. RUT ${rut}; revisa la evidencia y sus fuentes oficiales.`
      : `Consulta datos y registros públicos de ${entity.name}. RUT ${rut}; revisa el detalle disponible y sus fuentes oficiales.`
    : `Consulta los registros públicos disponibles de ${entity.name}, con períodos, evidencia y enlaces a sus fuentes oficiales.`;
  const canonical = `https://cambiometro.impulsacv.cl/entidades/${entity.id}/`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    twitter: { card: "summary", title, description },
  };
}
