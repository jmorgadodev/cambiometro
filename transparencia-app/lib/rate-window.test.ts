import { describe, expect, it } from "vitest";
import { enforceSlidingWindowRateLimit, hashIp } from "@/lib/rate-window";

interface Row {
  ip_hash: string;
  scope: string;
  created_at: string;
}

class MemoryD1 {
  rows: Row[] = [];

  seed(ipHash: string, scope: string, createdAt: string) {
    this.rows.push({ ip_hash: ipHash, scope, created_at: createdAt });
  }

  prepare = (statement: string) => {
    return {
      bind: (...values: Array<string | number | null>) => ({
        run: async () => {
          if (statement.startsWith("DELETE FROM request_rate_events WHERE created_at < ?")) {
            const cutoff = String(values[0]);
            this.rows = this.rows.filter((row) => row.created_at >= cutoff);
          } else if (statement.startsWith("INSERT INTO request_rate_events")) {
            this.rows.push({ ip_hash: String(values[0]), scope: String(values[1]), created_at: new Date().toISOString() });
          }
          return { success: true };
        },
        first: async () => {
          if (statement.startsWith("SELECT COUNT(*)")) {
            const ipHash = String(values[0]);
            const scope = String(values[1]);
            const cutoff = String(values[2]);
            const total = this.rows.filter((row) => row.ip_hash === ipHash && row.scope === scope && row.created_at >= cutoff).length;
            return { total };
          }
          return null;
        },
        all: async () => ({ results: [] }),
      }),
    };
  };
}

function request(ip: string) {
  const headers = new Headers();
  headers.set("cf-connecting-ip", ip);
  return new Request("https://cambiometro.impulsacv.cl/api/v1/requests", { method: "POST", headers });
}

describe("enforceSlidingWindowRateLimit (scope 10 por ventana de 6 horas)", () => {
  it("permite hasta 10 solicitudes y niega la 11 con la misma IP+scope", async () => {
    const db = new MemoryD1();
    for (let i = 0; i < 10; i += 1) {
      expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.5"), "requests")).toBe(true);
    }
    expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.5"), "requests")).toBe(false);
  });

  it("no comparte contador entre IPs ni entre scopes", async () => {
    const db = new MemoryD1();
    for (let i = 0; i < 10; i += 1) {
      await enforceSlidingWindowRateLimit(db as never, request("203.0.113.5"), "requests");
    }
    expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.6"), "requests")).toBe(true);
    expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.5"), "otro-scope")).toBe(true);
  });

  it("sin binding o sin IP no bloquea (modo local/CI)", async () => {
    expect(await enforceSlidingWindowRateLimit(undefined, request("203.0.113.5"), "requests")).toBe(true);
    const headers = new Headers();
    const noIp = new Request("https://cambiometro.impulsacv.cl/api/v1/requests", { method: "POST", headers });
    expect(await enforceSlidingWindowRateLimit(new MemoryD1() as never, noIp, "requests")).toBe(true);
  });

  it("expira la ventana: eventos viejos se purgan y el contador vuelve a cero", async () => {
    const db = new MemoryD1();
    const ipHash = hashIp("203.0.113.8");
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60_000).toISOString();
    for (let i = 0; i < 10; i += 1) {
      db.seed(ipHash, "requests", eightDaysAgo);
    }
    expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.8"), "requests")).toBe(true);
    expect(db.rows).toHaveLength(1);

    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60_000).toISOString();
    for (let i = 0; i < 9; i += 1) {
      db.seed(ipHash, "requests", fiveHoursAgo);
    }
    expect(await enforceSlidingWindowRateLimit(db as never, request("203.0.113.8"), "requests")).toBe(false);
  });
});
