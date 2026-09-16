import { describe, expect, it } from "vitest";
import { publicApiUrl } from "./public-api-origin";

describe("origen del API público en previews", () => {
  it("usa producción para que el preview local consulte el mismo R2", () => {
    expect(publicApiUrl("/api/v1/search?q=Latorre", "localhost"))
      .toBe("https://cambiometro.impulsacv.cl/api/v1/search?q=Latorre");
  });

  it("mantiene rutas relativas cuando la página ya está en producción", () => {
    expect(publicApiUrl("/api/v1/search?q=Latorre", "cambiometro.impulsacv.cl"))
      .toBe("/api/v1/search?q=Latorre");
  });

  it("permite usar un Worker de preview explícito", () => {
    expect(publicApiUrl("/api/v1/search?q=Latorre", "127.0.0.1", "https://preview.example.workers.dev"))
      .toBe("https://preview.example.workers.dev/api/v1/search?q=Latorre");
  });
});
