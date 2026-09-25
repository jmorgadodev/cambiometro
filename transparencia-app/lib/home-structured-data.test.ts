import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_STRUCTURED_DATA } from "@/lib/home-structured-data";

describe("home structured data", () => {
  it("connects the Cambiómetro site to its public organization profiles and logo", () => {
    const website = HOME_STRUCTURED_DATA["@graph"].find((node) => node["@type"] === "WebSite");
    const organization = HOME_STRUCTURED_DATA["@graph"].find(
      (node) => node["@id"] === "https://cambiometro.impulsacv.cl/#organization",
    );
    const publisher = HOME_STRUCTURED_DATA["@graph"].find(
      (node) => node["@id"] === website?.publisher?.["@id"],
    );

    expect(website?.publisher).toEqual({ "@id": "https://impulsacv.cl/#organization" });
    expect(website?.about).toEqual({ "@id": "https://cambiometro.impulsacv.cl/#organization" });
    expect(organization).toMatchObject({
      "@type": "Organization",
      name: "El Cambiómetro",
      url: "https://cambiometro.impulsacv.cl/",
      logo: "https://cambiometro.impulsacv.cl/brand/el-cambiometro-avatar.png",
    });
    expect(organization?.sameAs).toEqual(
      expect.arrayContaining([
        "https://www.instagram.com/cambiometro/",
        "https://x.com/cambiometro",
        "https://www.tiktok.com/@cambiometro",
        "https://www.facebook.com/profile.php?id=61593925561451",
      ]),
    );
    expect(publisher).toMatchObject({
      "@type": "Organization",
      name: "ImpulsaCV",
      url: "https://impulsacv.cl/",
    });
    expect(publisher?.sameAs).toContain("https://www.linkedin.com/company/impulsacv/");
  });

  it("does not emit the unsupported meta keywords tag", () => {
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/\bkeywords\s*:/);
  });
});
