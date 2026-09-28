const PRODUCTION_API_ORIGIN = "https://cambiometro.impulsacv.cl";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isCloudflarePagesPreview(hostname: string) {
  return hostname.toLowerCase().endsWith(".pages.dev");
}

/**
 * Local and Cloudflare Pages previews use the public API unless an explicit
 * preview API origin is configured. Production remains same-origin.
 */
export function publicApiUrl(path: string, hostname?: string, configuredOrigin?: string) {
  const currentHostname = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!isLocalHostname(currentHostname) && !isCloudflarePagesPreview(currentHostname)) return path;
  const origin = configuredOrigin?.trim() || process.env.NEXT_PUBLIC_PUBLIC_API_ORIGIN?.trim() || PRODUCTION_API_ORIGIN;
  return new URL(path, origin).toString();
}

