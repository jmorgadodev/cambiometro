export const CPLT_SCOPES = Object.freeze({
  MUNICIPAL: "municipal",
  CENTRAL: "central",
});

export function normalizeCpltScope(value) {
  const scope = String(value ?? CPLT_SCOPES.MUNICIPAL).trim().toLowerCase();
  if (!Object.values(CPLT_SCOPES).includes(scope)) {
    throw new Error(`CPLT_UNKNOWN_SCOPE: ${value}`);
  }
  return scope;
}

export function isMunicipalOrganization(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return /^(?:(?:i|ilustre) )?municipalidad\b|^municipio\b/.test(normalized);
}

export function acceptsCpltScope(organization, scope) {
  const normalizedScope = normalizeCpltScope(scope);
  return normalizedScope === CPLT_SCOPES.MUNICIPAL
    ? isMunicipalOrganization(organization)
    : !isMunicipalOrganization(organization);
}
