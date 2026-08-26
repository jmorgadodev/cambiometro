import { describe, expect, it } from "vitest";
import { buildRollbackRequest, validateDeploymentId } from "../scripts/pages-rollback.mjs";

describe("Pages rollback", () => {
  it("builds the official Pages rollback endpoint without exposing the token in the URL", () => {
    const request = buildRollbackRequest({ accountId: "account/unsafe", token: "secret", deploymentId: "dep_123" });
    expect(request.url).toBe("https://api.cloudflare.com/client/v4/accounts/account%2Funsafe/pages/projects/cambiometro/deployments/dep_123/rollback");
    expect(request.options.method).toBe("POST");
    expect(request.options.headers.Authorization).toBe("Bearer secret");
    expect(request.options.body).toBe("{}");
  });

  it("rejects an unsafe or missing deployment ID", () => {
    expect(() => validateDeploymentId("")).toThrow("pages:rollback");
    expect(() => validateDeploymentId("dep/123")).toThrow("pages:rollback");
  });
});
