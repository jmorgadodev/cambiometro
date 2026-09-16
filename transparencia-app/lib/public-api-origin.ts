const PRODUCTION_API_ORIGIN = "https://cambiometro.impulsacv.cl";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Keeps local previews on the same public R2-backed API as production. The
 * origin is only changed for local hosts; production remains same-origin.
 */
export function publicApiUrl(path: string, hostname?: string, configuredOrigin?: string) {
  const currentHostname = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!isLocalHostname(currentHostname)) return path;
  const origin = configuredOrigin?.trim() || process.env.NEXT_PUBLIC_PUBLIC_API_ORIGIN?.trim() || PRODUCTION_API_ORIGIN;
  return new URL(path, origin).toString();
}

