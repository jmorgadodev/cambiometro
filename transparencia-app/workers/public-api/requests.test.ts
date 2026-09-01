import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

function makeDb() {
  const run = vi.fn(async () => ({ meta: { last_row_id: 42 } }));
  const bind = vi.fn(() => ({ run }));
  const prepare = vi.fn(() => ({ bind }));
  return { db: { prepare } as unknown as NonNullable<Env["DB"]>, prepare, bind, run };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("https://cambiometro.impulsacv.cl/api/v1/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.8" },
    body: JSON.stringify({
      tipo: "acceso",
      nombre: "Persona de prueba",
      email: "persona@example.com",
      descripcion: "Solicito acceso a los datos publicados.",
      website: "",
      turnstileToken: "valid-token",
      ...overrides,
    }),
  });
}

afterEach(() => vi.restoreAllMocks());

describe("POST /api/v1/requests", () => {
  it("rechaza solicitudes sin desafío Turnstile", async () => {
    const { db, prepare } = makeDb();
    const response = await worker.fetch(makeRequest({ turnstileToken: "" }), {
      DB: db,
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "TURNSTILE_REQUIRED" } });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("valida Turnstile, guarda la solicitud y notifica por correo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    }));
    const { db, run } = makeDb();
    const send = vi.fn(async () => ({ messageId: "message-1" }));
    const response = await worker.fetch(makeRequest(), {
      DB: db,
      TURNSTILE_SECRET_KEY: "secret",
      EMAIL: { send } as unknown as NonNullable<Env["EMAIL"]>,
    });

    expect(response.status).toBe(201);
    expect(run).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: "Jorge.morgado.b@gmail.com",
      replyTo: "persona@example.com",
    }));
    expect(await response.json()).toMatchObject({
      data: { id: 42, estado: "recibida", notificacion: "enviada" },
    });
  });

  it("no guarda la solicitud cuando Turnstile rechaza el token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: false }), {
      headers: { "Content-Type": "application/json" },
    }));
    const { db, prepare } = makeDb();
    const response = await worker.fetch(makeRequest(), {
      DB: db,
      TURNSTILE_SECRET_KEY: "secret",
      EMAIL: { send: vi.fn() } as unknown as NonNullable<Env["EMAIL"]>,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "TURNSTILE_FAILED" } });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("informa configuración incompleta sin guardar datos", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    }));
    const { db, prepare } = makeDb();
    const response = await worker.fetch(makeRequest(), {
      DB: db,
      TURNSTILE_SECRET_KEY: "secret",
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "EMAIL_NOT_CONFIGURED" } });
    expect(prepare).not.toHaveBeenCalled();
  });
});
