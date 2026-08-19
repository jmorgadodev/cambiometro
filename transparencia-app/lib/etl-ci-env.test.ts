import { describe, expect, it } from "vitest";
import { requireCloudflareDataCredentials } from "../scripts/etl/ci-env.mjs";

describe("credenciales de publicacion de datos", () => {
  it("falla cerrado si falta el token o account id", () => {
    expect(() => requireCloudflareDataCredentials({})).toThrow("CLOUDFLARE_ACCOUNT_ID");
    expect(() => requireCloudflareDataCredentials({ CLOUDFLARE_ACCOUNT_ID: "account" }))
      .toThrow("CLOUDFLARE_API_TOKEN");
  });

  it("acepta credenciales separadas para R2 y D1", () => {
    expect(requireCloudflareDataCredentials({
      CLOUDFLARE_ACCOUNT_ID: "account",
      CLOUDFLARE_API_TOKEN: "data-token",
    })).toEqual({ accountId: "account", token: "data-token" });
  });
});
