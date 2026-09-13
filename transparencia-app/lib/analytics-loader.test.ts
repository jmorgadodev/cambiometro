import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = join(process.cwd(), "app");

describe("integración de analítica", () => {
  it("mantiene un único cargador con consentimiento", () => {
    const layout = readFileSync(join(appRoot, "layout.tsx"), "utf8");
    const consent = readFileSync(join(process.cwd(), "components", "CookieConsent.tsx"), "utf8");

    expect(layout).not.toContain("tracking-consent.js");
    expect(layout).not.toContain("googletagmanager.com/gtag/js");
    expect(consent).toContain("function loadTracking()");
    expect(consent).toContain('localStorage.getItem(CONSENT_KEY)');
  });
});
