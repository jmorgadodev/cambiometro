const OMITTED_KEYS = new Set([
  "domicilio",
  "domicilio_particular",
  "direccion_particular",
  "cuenta_bancaria",
  "numero_cuenta",
  "firma",
  "firma_digital",
]);

export function sanitizePublicPayload(value: unknown, key = ""): unknown {
  const normalizedKey = key.toLocaleLowerCase("es-CL");
  if (OMITTED_KEYS.has(normalizedKey)) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicPayload(item)).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([entryKey, entryValue]) => [entryKey, sanitizePublicPayload(entryValue, entryKey)])
        .filter(([, entryValue]) => entryValue !== undefined),
    );
  }

  return value;
}
