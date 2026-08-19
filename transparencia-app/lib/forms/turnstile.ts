const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

export interface TurnstileVerification {
  success: boolean;
  error?: string;
}

function isProduction() {
  return process.env.NODE_ENV === "production" && process.env.CF_PAGES !== "1";
}

function remoteAddress(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
}

export async function verifyTurnstileToken(token: string | null, request: Request): Promise<TurnstileVerification> {
  if (!token || token.length > 4096) return { success: false, error: "missing-or-invalid-token" };

  const configured = process.env.TURNSTILE_SECRET_KEY ?? "";
  const secretKey = configured || (isProduction() ? "" : TURNSTILE_TEST_SECRET_KEY);
  if (!secretKey) return { success: false, error: "not-configured" };

  if (secretKey === TURNSTILE_TEST_SECRET_KEY) {
    if (token === "XXXX.DUMMY.TOKEN.XXXX") return { success: false, error: "dummy-token-rejected" };
    return { success: true };
  }

  try {
    const form = new FormData();
    form.set("secret", secretKey);
    form.set("response", token);
    const ip = remoteAddress(request);
    if (ip) form.set("remoteip", ip);
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    if (!response.ok) return { success: false, error: `siteverify-http-${response.status}` };
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (result.success) return { success: true };
    return { success: false, error: (result["error-codes"] ?? []).join(",") || "unknown" };
  } catch {
    return { success: false, error: "siteverify-unreachable" };
  }
}
