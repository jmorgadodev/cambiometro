import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/forms/turnstile";

const MAX_BODY_BYTES = 64 * 1024;
const REQUIRED_KINDS = ["csp-violation", "rate-limit", "challenge", "incident"] as const;

function kindHeader(kind: string | null): string {
  if (kind && (REQUIRED_KINDS as readonly string[]).includes(kind)) return kind;
  return "csp-violation";
}

export async function POST(request: Request) {
  const limited = await enforcePublicRateLimit(request, "csp-report");
  if (limited) return limited;

  // Los reportes CSP nativos del navegador no pueden cargar un token Turnstile
  // (se envían sin ejecutar JavaScript); si el agente trae token, se verifica
  // igualmente de forma server-side. La protección real del endpoint es el rate
  // limit + validación de forma + tamaño máximo.
  const providedToken = request.headers.get("x-turnstile-token");
  if (providedToken) {
    const verification = await verifyTurnstileToken(providedToken, request);
    if (!verification.success) {
      return Response.json({ ok: false }, { status: 400, headers: { "X-Content-Type-Options": "nosniff" } });
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 413, headers: { "X-Content-Type-Options": "nosniff" } });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: { "X-Content-Type-Options": "nosniff" } });
  }

  const payload = JSON.stringify(body);
  if (payload.length > MAX_BODY_BYTES) {
    return Response.json({ ok: false }, { status: 413, headers: { "X-Content-Type-Options": "nosniff" } });
  }

  const kind = kindHeader(request.headers.get("x-security-event-kind"));
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.DB) {
      await env.DB.prepare("INSERT INTO security_events (kind, payload) VALUES (?, ?)").bind(kind, payload).run();
    }
  } catch {
    // Sin persistencia no se bloquea el sitio; el evento se pierde.
  }

  return Response.json({ ok: true }, { status: 202, headers: { "X-Content-Type-Options": "nosniff" } });
}
