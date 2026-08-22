import { describe, it, expect } from "vitest";
import {
  slugifyNombre,
  getMuniSlug,
  getMuniBySlugOrId,
  getMuniCanonicalSlug,
  isMuniLegacyId,
  getAllMuniSlugs,
  getServicioSlug,
  getServicioBySlugOrId,
  getServicioCanonicalSlug,
  isServicioLegacyId,
  getAllServicioSlugs,
} from "@/lib/slug-utils";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { getAllServiciosPublicos, SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";

describe("Tarea A — Slugs Semánticos", () => {
  // ── Slugify ──────────────────────────────────────────────────────────────

  it("slugifyNombre: quita tildes, espacios a guiones, minúsculas", () => {
    expect(slugifyNombre("Ñuñoa")).toBe("nunoa");
    expect(slugifyNombre("Alto Hospicio")).toBe("alto-hospicio");
    expect(slugifyNombre("Pozo Almonte")).toBe("pozo-almonte");
    expect(slugifyNombre("Ministerio del Interior y Seguridad Pública")).toBe(
      "ministerio-del-interior-y-seguridad-publica"
    );
  });

  // ── Municipalidades ───────────────────────────────────────────────────────

  it("getMuniSlug: sin prefijo muni-, nombre slugificado", () => {
    const iquique = MUNICIPALIDADES_SEED.find((m) => m.id === "muni-iquique")!;
    expect(getMuniSlug(iquique)).toBe("iquique");

    const altohospicio = MUNICIPALIDADES_SEED.find((m) => m.id === "muni-altohospicio")!;
    expect(getMuniSlug(altohospicio)).toBe("alto-hospicio");

    const maipu = MUNICIPALIDADES_SEED.find((m) => m.id === "muni-maipu")!;
    expect(getMuniSlug(maipu)).toBe("maipu");
  });

  it("getMuniBySlugOrId: lookup dual acepta slug nuevo y ID legado", () => {
    // Slug nuevo
    const porSlug = getMuniBySlugOrId("iquique");
    expect(porSlug).not.toBeNull();
    expect(porSlug?.nombre_comuna).toBe("Iquique");

    // ID legado
    const porId = getMuniBySlugOrId("muni-iquique");
    expect(porId).not.toBeNull();
    expect(porId?.nombre_comuna).toBe("Iquique");

    // Mismo objeto
    expect(porSlug?.id).toBe(porId?.id);
  });

  it("getMuniCanonicalSlug: devuelve slug sin prefijo para ambos formatos", () => {
    expect(getMuniCanonicalSlug("iquique")).toBe("iquique");
    expect(getMuniCanonicalSlug("muni-iquique")).toBe("iquique");
    expect(getMuniCanonicalSlug("muni-altohospicio")).toBe("alto-hospicio");
  });

  it("isMuniLegacyId: detecta IDs con prefijo muni-", () => {
    expect(isMuniLegacyId("muni-iquique")).toBe(true);
    expect(isMuniLegacyId("muni-maipu")).toBe(true);
    expect(isMuniLegacyId("iquique")).toBe(false);
    expect(isMuniLegacyId("alto-hospicio")).toBe(false);
    expect(isMuniLegacyId("")).toBe(false);
  });

  it("getAllMuniSlugs: mismo conteo que MUNICIPALIDADES_SEED, sin prefijo muni-", () => {
    const slugs = getAllMuniSlugs();
    expect(slugs.length).toBe(MUNICIPALIDADES_SEED.length);
    for (const { slug } of slugs) {
      expect(slug).not.toMatch(/^muni-/);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("sitemap de municipalidades no contiene prefijo muni-", () => {
    const slugs = getAllMuniSlugs();
    const urls = slugs.map(({ slug }) => `/municipalidades/${slug}`);
    for (const url of urls) {
      expect(url).not.toContain("/municipalidades/muni-");
    }
  });

  // ── Servicios Públicos ────────────────────────────────────────────────────

  it("getServicioSlug: nombre completo slugificado sin prefijo", () => {
    const interior = SERVICIOS_PUBLICOS_SEED.find((s) => s.id === "min-interior")!;
    expect(getServicioSlug(interior)).toBe(
      "ministerio-del-interior-y-seguridad-publica"
    );

    const salud = SERVICIOS_PUBLICOS_SEED.find((s) => s.id === "min-salud")!;
    expect(getServicioSlug(salud)).toBe("ministerio-de-salud");
  });

  it("getServicioBySlugOrId: lookup dual acepta slug nuevo y ID legado", () => {
    // ID legado
    const porId = getServicioBySlugOrId("min-interior");
    expect(porId).not.toBeNull();
    expect(porId?.nombre).toContain("Interior");

    // Slug nuevo
    const porSlug = getServicioBySlugOrId(
      "ministerio-del-interior-y-seguridad-publica"
    );
    expect(porSlug).not.toBeNull();
    expect(porSlug?.id).toBe("min-interior");

    // Mismo objeto
    expect(porId?.id).toBe(porSlug?.id);
  });

  it("getServicioCanonicalSlug: devuelve slug sin prefijo para ambos formatos", () => {
    expect(getServicioCanonicalSlug("min-interior")).toBe(
      "ministerio-del-interior-y-seguridad-publica"
    );
    expect(getServicioCanonicalSlug("min-salud")).toBe(
      "ministerio-de-salud"
    );
    // Si ya es slug, devuelve igual
    expect(getServicioCanonicalSlug("ministerio-de-salud")).toBe(
      "ministerio-de-salud"
    );
  });

  it("isServicioLegacyId: detecta IDs con prefijos min-, sub-, sna-, etc.", () => {
    expect(isServicioLegacyId("min-interior")).toBe(true);
    expect(isServicioLegacyId("min-salud")).toBe(true);
    expect(isServicioLegacyId("ministerio-de-salud")).toBe(false);
    expect(isServicioLegacyId("ministerio-del-interior-y-seguridad-publica")).toBe(false);
    expect(isServicioLegacyId("")).toBe(false);
  });

  it("getAllServicioSlugs: mismo conteo que getAllServiciosPublicos, sin prefijos funcionales", () => {
    const slugs = getAllServicioSlugs();
    const total = getAllServiciosPublicos().length;
    expect(slugs.length).toBe(total);
    for (const { slug } of slugs) {
      expect(slug).not.toMatch(/^min-/);
      expect(slug).not.toMatch(/^sub-/);
      expect(slug).not.toMatch(/^sna-/);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("sitemap de servicios no contiene prefijos funcionales", () => {
    const slugs = getAllServicioSlugs();
    const urls = slugs.map(({ slug }) => `/servicios-publicos/${slug}`);
    for (const url of urls) {
      expect(url).not.toMatch(/\/servicios-publicos\/min-/);
      expect(url).not.toMatch(/\/servicios-publicos\/sub-/);
      expect(url).not.toMatch(/\/servicios-publicos\/sna-/);
    }
  });
});
