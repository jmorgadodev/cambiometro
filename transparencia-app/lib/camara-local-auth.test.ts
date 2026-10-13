import { describe, expect, it } from "vitest";
import { selectCamaraAdvisoriesCredentials } from "../scripts/etl/camara-local-auth.mjs";

describe("autenticación local de asesorías Cámara", () => {
  it("no deja que el token general fallido sustituya la sesión OAuth autorizada", () => {
    const environment = { CLOUDFLARE_ACCOUNT_ID: "account-fixture", CLOUDFLARE_API_TOKEN: "general-fixture" };
    expect(selectCamaraAdvisoriesCredentials(environment, { type: "oauth", token: "oauth-fixture" })).toEqual({
      accountId: "account-fixture", token: "oauth-fixture",
    });
    expect(environment.CLOUDFLARE_API_TOKEN).toBe("general-fixture");
  });
  it("respeta una credencial específica de datos ya configurada", () => {
    expect(selectCamaraAdvisoriesCredentials({ CLOUDFLARE_ACCOUNT_ID: "account-fixture", CLOUDFLARE_DATA_API_TOKEN: "data-fixture" }, null)).toEqual({
      accountId: "account-fixture", token: "data-fixture",
    });
  });
  it("no vuelve al token general si falta la sesión o su tipo no es OAuth", () => {
    const environment = { CLOUDFLARE_ACCOUNT_ID: "account-fixture", CLOUDFLARE_API_TOKEN: "general-fixture" };
    expect(() => selectCamaraAdvisoriesCredentials(environment, null)).toThrow("REAUTH_REQUIRED");
    expect(() => selectCamaraAdvisoriesCredentials(environment, { type: "api", token: "general-fixture" })).toThrow("REAUTH_REQUIRED");
    expect(() => selectCamaraAdvisoriesCredentials({}, { type: "oauth", token: "oauth-fixture" })).toThrow("ACCOUNT_REQUIRED");
  });
});
