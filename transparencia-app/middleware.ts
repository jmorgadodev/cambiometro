import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function contentSecurityPolicy(nonce: string) {
  const developmentEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const ga4 = process.env.NEXT_PUBLIC_GA4_ID?.trim();
  const analyticsScriptSrc = ga4 ? " https://www.googletagmanager.com" : "";
  const analyticsConnectSrc = ga4 ? " https://www.google-analytics.com https://www.googletagmanager.com" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentEval} https://challenges.cloudflare.com${analyticsScriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://upload.wikimedia.org",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com${analyticsConnectSrc}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join("; ");
}

function generateNonce(request: NextRequest): string {
  // ISR cache HIT must have nonce(HTML) == nonce(CSP header). Use deterministic nonce per URL per 5min bucket (revalidate 300s)
  // so that cached HTML (generated with nonce at T0) and fresh CSP header (at T0+<300s) share same value.
  // Falls back to random UUID outside ISR window.
  try {
    const bucket = Math.floor(Date.now() / 300_000).toString(); // 5min
    const raw = `${request.nextUrl.pathname}:${request.nextUrl.search}:${bucket}`;
    return btoa(raw).replace(/[^A-Za-z0-9]/g, "").slice(0, 22).padEnd(22, "A");
  } catch {
    return btoa(crypto.randomUUID()).replace(/[^A-Za-z0-9]/g, "").slice(0, 22);
  }
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce(request);
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // El CSP real ya está endurecido en producción; el modo Report-Only se usa
  // solo para validar directivas nuevas sin riesgo (staging, CSP_REPORT_ONLY=true).
  if (process.env.CSP_REPORT_ONLY === "true") {
    response.headers.set("Content-Security-Policy-Report-Only", csp);
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|widget\\.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
