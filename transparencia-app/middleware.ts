import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getMuniCanonicalSlug,
  isMuniLegacyId,
  getServicioCanonicalSlug,
  isServicioLegacyId,
} from "@/lib/slug-utils";
import {
  isLegacyPoliticoId,
  getPoliticoSlug,
  getPoliticoByIdOrSlug,
} from "@/lib/politico-slugs";

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

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Redirecciones 301 permanentes para URLs legadas hacia slugs semánticos
  if (pathname.startsWith("/municipalidades/")) {
    const id = pathname.replace("/municipalidades/", "");
    if (isMuniLegacyId(id)) {
      const slug = getMuniCanonicalSlug(id);
      if (slug && slug !== id) {
        return NextResponse.redirect(new URL(`/municipalidades/${slug}`, request.url), 301);
      }
    }
  }

  if (pathname.startsWith("/servicios-publicos/")) {
    const id = pathname.replace("/servicios-publicos/", "");
    if (isServicioLegacyId(id)) {
      const slug = getServicioCanonicalSlug(id);
      if (slug && slug !== id) {
        return NextResponse.redirect(new URL(`/servicios-publicos/${slug}`, request.url), 301);
      }
    }
  }

  if (pathname.startsWith("/politico/")) {
    const id = pathname.replace("/politico/", "");
    if (isLegacyPoliticoId(id)) {
      const pol = getPoliticoByIdOrSlug(id);
      if (pol) {
        const slug = getPoliticoSlug(pol);
        if (slug && slug !== id) {
          return NextResponse.redirect(new URL(`/politico/${slug}`, request.url), 301);
        }
      }
    }
  }

  const nonce = btoa(crypto.randomUUID());
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
