import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { enforceSlidingWindowRateLimit, clientIp } from "@/lib/rate-window";
import { verifyTurnstileToken } from "@/lib/forms/turnstile";
import { isHoneypotFilled } from "@/lib/forms/honeypot";

const REQUEST_TYPES = new Set(["rectificacion", "cancelacion", "oposicion", "acceso", "informacion", "otro"]);
const MAX_DESCRIPCION = 4000;

export async function POST(request: Request) {
  const limited = await enforcePublicRateLimit(request, "requests");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: "INVALID_BODY", message: "El cuerpo debe ser JSON válido." } }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: { code: "INVALID_BODY", message: "El cuerpo debe ser un objeto JSON." } }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const tipo = typeof values.tipo === "string" ? values.tipo : "";
  const nombre = typeof values.nombre === "string" ? values.nombre.trim() : "";
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const descripcion = typeof values.descripcion === "string" ? values.descripcion.trim() : "";
  const turnstileToken = typeof values.turnstileToken === "string" ? values.turnstileToken : null;

  if (!REQUEST_TYPES.has(tipo)) {
    return Response.json({ error: { code: "INVALID_TYPE", message: "Tipo de solicitud no válido." } }, { status: 400 });
  }
  if (!/^[^@\s]{1,120}@[^@\s]{1,120}\.[a-zA-Z]{2,}$/.test(email)) {
    return Response.json({ error: { code: "INVALID_EMAIL", message: "Correo electrónico no válido." } }, { status: 400 });
  }
  if (descripcion.length < 10 || descripcion.length > MAX_DESCRIPCION) {
    return Response.json({ error: { code: "INVALID_DESCRIPTION", message: `La descripción debe tener entre 10 y ${MAX_DESCRIPCION} caracteres.` } }, { status: 400 });
  }

  const verification = await verifyTurnstileToken(turnstileToken, request);
  if (!verification.success) {
    return Response.json({ error: { code: "TURNSTILE_FAILED", message: "No se pudo verificar el formulario. Intente nuevamente." } }, { status: 403 });
  }

  const formData = new FormData();
  formData.set("website", String(values.website ?? ""));
  if (isHoneypotFilled(formData)) {
    return Response.json({ error: { code: "SPAM_DETECTED", message: "Solicitud rechazada." } }, { status: 400 });
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.DB) {
      return Response.json({ error: { code: "STORAGE_UNAVAILABLE", message: "El canal no está disponible ahora." } }, { status: 503 });
    }

    const allowed = await enforceSlidingWindowRateLimit(env.DB, request, "requests");
    if (!allowed) {
      return Response.json({
        error: { code: "RATE_LIMITED", message: "Demasiadas solicitudes. Intente nuevamente más tarde." },
      }, {
        status: 429,
        headers: { "Retry-After": "3600", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
      });
    }

    const ip = clientIp(request);
    const ipHash = ip ? Buffer.from(`req:${ip}`).toString("base64") : null;
    const result = await env.DB.prepare(
      "INSERT INTO data_requests (tipo, nombre, email, descripcion, ip_hash, estado) VALUES (?, ?, ?, ?, ?, 'recibida')",
    ).bind(tipo, nombre || null, email, descripcion, ipHash).run();

    return Response.json({
      data: { id: result.meta.last_row_id, estado: "recibida" },
      meta: { respuestaPlazo: "El plazo de respuesta está definido en /privacidad conforme a la Ley 21.715." },
    }, {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  } catch {
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "No fue posible registrar la solicitud." } }, { status: 500 });
  }
}
