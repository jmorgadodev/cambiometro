import { validateModulo11 } from "./servicios-publicos-rut";

/** Returns a validated public juridical RUT only from known public identifier schemes. */
export function publicLegalRutValue(identifier: { scheme: string; value: string; isPublic: boolean }): string | null {
  if (!identifier.isPublic) return null;

  let candidate: string | null = null;
  if (identifier.scheme === "CL-RUT" || identifier.scheme === "CHILECOMPRA-RUT") {
    candidate = identifier.value;
  } else if (identifier.scheme === "CL-MP") {
    // ChileCompra supplier IDs encode legal RUTs as `legal-cl-<compact RUT>`.
    // Do not infer a RUT from opaque MercadoPúblico identifiers.
    const match = /^legal-cl-(\d{7,8}[0-9k])$/i.exec(identifier.value.trim());
    candidate = match?.[1] ?? null;
  }

  if (!candidate || !validateModulo11(candidate)) return null;
  return candidate.replace(/[^0-9k]/gi, "").toUpperCase();
}
