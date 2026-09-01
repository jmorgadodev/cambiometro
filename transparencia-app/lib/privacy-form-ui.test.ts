import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("canal de solicitudes de privacidad", () => {
  const component = readFileSync(
    resolve(import.meta.dirname, "../components/PrivacyRequestForm.tsx"),
    "utf8",
  );

  it("explica el desafío y no simula disponibilidad sin site key", () => {
    expect(component).toContain("Completa el desafío de verificación para enviar la solicitud.");
    expect(component).toContain('disabled={state === "sending" || !siteKey}');
    expect(component).toContain("El formulario está temporalmente fuera de servicio");
  });

  it("inyecta la site key real en los dos workflows que pueden publicar Pages", () => {
    for (const workflow of ["pages-ui-refresh.yml", "pages-static-refresh.yml"]) {
      const source = readFileSync(resolve(import.meta.dirname, `../../.github/workflows/${workflow}`), "utf8");
      expect(source).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY: ${{ vars.NEXT_PUBLIC_TURNSTILE_SITE_KEY }}");
    }
  });

  it("sólo tolera el 400 de Turnstile productivo cuando se verifica en localhost", () => {
    const verifier = readFileSync(
      resolve(import.meta.dirname, "../scripts/verify-integration.mjs"),
      "utf8",
    );

    expect(verifier).toContain("/^https:\\/\\/challenges\\.cloudflare\\.com\\//.test(locationUrl)");
    expect(verifier).toContain('message.includes("Failed to load resource: the server responded with a status of 400")');
    expect(verifier).not.toContain(
      'verifyingLocal && message.includes("Failed to load resource: the server responded with a status of 400")\n    )',
    );
  });
});
