export const HONEYPOT_FIELD_NAME = "website";

export function isHoneypotFilled(formData: FormData): boolean {
  const value = (formData.get(HONEYPOT_FIELD_NAME) ?? "").toString().trim();
  return value.length > 0;
}
