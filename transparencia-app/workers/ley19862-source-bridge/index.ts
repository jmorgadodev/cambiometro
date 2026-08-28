const OFFICIAL_ORIGIN = "https://registros19862.gob.cl";

interface Env {
  SOURCE_BRIDGE_TOKEN: string;
}

function transferUrl(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    "trans[desde]": from,
    "trans[hasta]": to,
    "trans[fecha]": "d",
    "trans[ejecutar]": "",
    csv: "1",
  });
  return `${OFFICIAL_ORIGIN}/reporte/transferencias?${params}`;
}

export function tokenMatches(provided: string, expected: string) {
  // `wrangler secret put` reads from stdin and may preserve a final newline.
  // The runner sends the generated token as a header without that newline.
  // Normalize only surrounding whitespace; the token remains otherwise exact.
  const normalizedProvided = provided.trim();
  const normalizedExpected = expected.trim();
  if (!normalizedProvided || !normalizedExpected) return false;

  const left = new TextEncoder().encode(normalizedProvided);
  const right = new TextEncoder().encode(normalizedExpected);
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function denied() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return Response.json({ ok: true, tokenConfigured: Boolean(env.SOURCE_BRIDGE_TOKEN) }, { headers: { "Cache-Control": "no-store" } });
    }
    if (url.pathname !== "/fetch" || request.method !== "GET") return denied();
    if (!tokenMatches(request.headers.get("X-Source-Bridge-Token") ?? "", env.SOURCE_BRIDGE_TOKEN ?? "")) return denied();

    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    if (!Number.isInteger(year) || year < 2003 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return new Response("Invalid period", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    try {
      const upstream = await fetch(transferUrl(year, month), {
        headers: { "User-Agent": "TransparenciaChile-ETL/3.0", Accept: "text/csv" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!upstream.ok) {
        upstream.body?.cancel();
        return new Response("Official source unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Source": "registros19862.gob.cl",
        },
      });
    } catch {
      return new Response("Official source unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  },
};

export default handler;
