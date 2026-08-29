import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("redes sociales del footer", () => {
  it("publica los cuatro perfiles oficiales con etiquetas accesibles", () => {
    const layout = readFileSync(resolve("app/layout.tsx"), "utf8");
    for (const url of [
      "https://www.tiktok.com/@cambiometro",
      "https://www.instagram.com/cambiometro/",
      "https://x.com/cambiometro",
      "https://www.facebook.com/profile.php?id=61593925561451",
    ]) expect(layout).toContain(url);
    expect(layout).toContain("FacebookIcon");
  });
});
