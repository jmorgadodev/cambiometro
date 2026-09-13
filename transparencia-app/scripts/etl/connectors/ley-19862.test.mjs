import { describe, expect, it } from "vitest";
import { fetchTransferMonth } from "./ley-19862.mjs";

const csv = [
  "FOLIO;FECHA_DECRETO;FECHA_INGRESO;PERIODO;EMISORA_RUT;EMISORA_NOMBRE;RECEPTORA_RUT;RECEPTORA_NOMBRE;MONTO",
  "1;01-01-2026;02-01-2026;2026;61111111-1;Emisor;61111112-2;Receptor;1000",
].join("\n");

describe("conector Ley 19.862", () => {
  it("reintenta timeouts de Node antes de fallar", async () => {
    let attempts = 0;
    const result = await fetchTransferMonth({
      year: 2026,
      month: 1,
      timeoutMs: 10,
      maxAttempts: 2,
      retryDelayMs: 1,
      fetchImpl: async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error("connect timeout"), { name: "TimeoutError" });
        return { ok: true, arrayBuffer: async () => Buffer.from(csv) };
      },
    });

    expect(attempts).toBe(2);
    expect(result.records).toHaveLength(1);
  });

  it("usa el bridge sólo como transporte y conserva la URL oficial", async () => {
    const previousUrl = process.env.LEY_19862_SOURCE_BRIDGE_URL;
    const previousToken = process.env.LEY_19862_SOURCE_BRIDGE_TOKEN;
    let requestedUrl = "";
    let requestedToken = "";
    process.env.LEY_19862_SOURCE_BRIDGE_URL = "https://source.example.workers.dev/fetch";
    process.env.LEY_19862_SOURCE_BRIDGE_TOKEN = "test-token";
    try {
      const result = await fetchTransferMonth({
        year: 2026,
        month: 2,
        fetchImpl: async (url, options) => {
          requestedUrl = String(url);
          requestedToken = options.headers["X-Source-Bridge-Token"];
          return { ok: true, arrayBuffer: async () => Buffer.from(csv) };
        },
      });
      expect(new URL(requestedUrl).pathname).toBe("/fetch");
      expect(new URL(requestedUrl).searchParams.get("year")).toBe("2026");
      expect(new URL(requestedUrl).searchParams.get("month")).toBe("2");
      expect(requestedToken).toBe("test-token");
      expect(result.original.url).toContain("https://registros19862.gob.cl/reporte/transferencias");
    } finally {
      if (previousUrl === undefined) delete process.env.LEY_19862_SOURCE_BRIDGE_URL;
      else process.env.LEY_19862_SOURCE_BRIDGE_URL = previousUrl;
      if (previousToken === undefined) delete process.env.LEY_19862_SOURCE_BRIDGE_TOKEN;
      else process.env.LEY_19862_SOURCE_BRIDGE_TOKEN = previousToken;
    }
  });
});
