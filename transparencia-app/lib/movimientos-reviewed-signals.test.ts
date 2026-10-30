import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildMovementPayload, parseMovementSignals } from "@/scripts/movimientos-pipeline.mjs";
import { hasMovementPublicChanges } from "@/scripts/movimientos-publication.mjs";
import { latestMovementReviewDate } from "@/lib/movement-age";

describe("anuncios revisados pendientes de confirmación legal", () => {
  const file = resolve(process.cwd(), "data/movimientos-reviewed-signals.json");

  it("incorpora cuatro omisiones documentadas y enriquece Rodrigo sin duplicar ni confirmar legalmente", () => {
    expect(existsSync(file)).toBe(true);
    const reviewed = JSON.parse(readFileSync(file, "utf8"));
    expect(latestMovementReviewDate(reviewed.reviewedAt, reviewed.signals)).toBe("2026-10-29");
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), "data/movimientos.json"), "utf8"));
    const baseline = JSON.parse(JSON.stringify(buildMovementPayload(raw, {now:"2026-10-29T12:00:00Z"})));
    const rodrigo = reviewed.signals.find((signal: { signal_id: string }) => signal.signal_id === "signal-9a0d758e4407ac6eebd6ab80");
    const previous = { ...baseline, signals: [...baseline.signals, { ...rodrigo, person_name: undefined, role: undefined, ministry: undefined, region: undefined, title: "Seremi de Economía de Aysén renuncia por motivos personales" }] };
    const candidate = buildMovementPayload(previous, {now:"2026-10-30T01:00:00Z",signalSeeds:reviewed.signals});
    for (const name of ["Cristian Pradenas", "José Francisco Lagos", "Ronald Ruf", "David Plaza"]) {
      const rows = candidate.signals.filter((signal: {person_name?: string}) => signal.person_name === name);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("en_confirmacion");
      expect(rows[0].verification).toBeUndefined();
    }
    const enriched = candidate.signals.filter((signal: {signal_id: string}) => signal.signal_id === rodrigo.signal_id);
    expect(enriched).toHaveLength(1);
    expect(enriched[0].person_name).toBe("Rodrigo Aguilera Silva");
    expect(enriched[0].date).toBe("2026-10-19");
    expect(JSON.parse(JSON.stringify(candidate.movimientos))).toEqual(baseline.movimientos);
    expect(candidate.stats.total_eventos_publicados).toBe(56);
    const repeated = buildMovementPayload(candidate, {now:"2026-10-31T01:00:00Z",signalSeeds:reviewed.signals});
    expect(hasMovementPublicChanges(candidate,repeated)).toBe(false);
  });

  it.each([
    "Diputado exige la renuncia del ministro de Justicia",
    "Neme pide la renuncia del ministro de Justicia",
    "Oposición solicita la renuncia de un ministro",
    "Cámara de Diputados aprueba pedir la renuncia al ministro de Justicia",
  ])("no cuenta una exigencia política como salida: %s", (title) => {
    expect(parseMovementSignals(JSON.stringify([{ title, url:"https://www.adnradio.cl/noticia/", date:"2026-10-29" }]), { id:"adn-radio",url:"https://www.adnradio.cl/noticias/politica/",contentType:"application/json" })).toHaveLength(0);
  });

  it("no cuenta una noticia económica que sólo menciona decreto", () => {
    expect(parseMovementSignals(JSON.stringify([{title:"Los empleos no se generan por decreto: Gobierno insiste en el rol de los privados",url:"https://radio.uchile.cl/2026/10/29/empleos/",date:"2026-10-29"}]), {id:"radio-uchile",url:"https://radio.uchile.cl/feed/",contentType:"application/json"})).toHaveLength(0);
  });

  it("conserva decretos que sí anuncian un nombramiento", () => {
    expect(parseMovementSignals(JSON.stringify([{title:"Decreto nombra al nuevo seremi de Salud",url:"https://www.bcn.cl/2026/10/29/nombramiento/",date:"2026-10-29"}]), {id:"ley-chile",url:"https://www.bcn.cl/leychile/",contentType:"application/json"})).toHaveLength(1);
  });

  it("depura el falso decreto y las noticias ya usadas como evidencia sin alterar los 46 movimientos", () => {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), "data/movimientos.json"), "utf8"));
    const baseline = JSON.parse(JSON.stringify(buildMovementPayload(raw, {now:"2026-10-29T12:00:00Z"})));
    baseline.movimientos.find((movement: {saliente:string})=>movement.saliente==="Patricio Löhr").fuentes.push({nivel:"prensa",medio:"Emol",url:"https://www.emol.com/noticias/Nacional/2026/09/02/1210280/renuncia-seremi-transportes-de-arica.html",fecha:"2026-09-02"});
    const reviewed = JSON.parse(readFileSync(file,"utf8"));
    const previous = {...baseline,signals:[...baseline.signals,
      {signal_id:"employment-article",title:"Los empleos no se generan por decreto: Gobierno insiste en el rol de los privados",url:"https://radio.uchile.cl/2026/10/29/empleos/",date:"2026-10-29",status:"en_confirmacion"},
      {signal_id:"existing-emol-evidence",title:"Van 34: Renuncia seremi de Transportes de Arica tras acusaciones de conflicto de interés",url:"https://www.emol.com/noticias/Nacional/2026/09/02/1210280/renuncia-seremi-transportes-de-arica.html",date:"2026-09-02",status:"en_confirmacion"},
      {signal_id:"same-pradenas-article",title:"Nueva renuncia en el Gobierno del Presidente Kast: seremi de Bienes Nacionales de Arica y Parinacota deja su cargo",url:reviewed.signals[0].url,date:"2026-10-23",status:"en_confirmacion"},
    ]};
    const candidate = buildMovementPayload(previous,{now:"2026-10-30T01:30:00Z",signalSeeds:reviewed.signals});
    expect(candidate.signals.some((signal: {signal_id:string})=>["employment-article","existing-emol-evidence","same-pradenas-article"].includes(signal.signal_id))).toBe(false);
    expect(candidate.stats.total_eventos_publicados).toBe(56);
    expect(JSON.parse(JSON.stringify(candidate.movimientos))).toEqual(baseline.movimientos);
  });

  it("sí cuenta la solicitud del Gobierno a un seremi", () => {
    expect(parseMovementSignals(JSON.stringify([{title:"Gobierno solicita la renuncia de un seremi",url:"https://www.adnradio.cl/noticia/",date:"2026-10-29"}]), {id:"adn-radio",url:"https://www.adnradio.cl/noticias/politica/",contentType:"application/json"})).toHaveLength(1);
  });

  it("no cuenta una renuncia a un partido como salida del cargo público", () => {
    expect(parseMovementSignals(JSON.stringify([{title:"Delegado Anativia renuncia a Renovación Nacional",url:"https://www.diarioconcepcion.cl/politica/2026/10/29/delegado-renuncia.html",date:"2026-10-29"}]), {id:"diario-concepcion",url:"https://www.diarioconcepcion.cl/politica/",contentType:"application/json"})).toHaveLength(0);
  });

  it("no extrae noticias relacionadas del lateral de un artículo consultado", () => {
    const html = '<meta property="og:title" content="Seremi de Hacienda Ronald Ruf presenta su renuncia"><a href="/politica/2026/04/08/seremi-asume.html">Ronald Ruf asume como nuevo Seremi de Hacienda</a>';
    const rows = parseMovementSignals(html, {id:"diario-concepcion",url:"https://www.diarioconcepcion.cl/politica/2026/10/19/renuncia-seremi.html",contentType:"text/html"});
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-10-19");
  });

  it("lee la fecha publicada en enlaces de un índice de prensa", () => {
    const rows = parseMovementSignals('<a href="/2026/10/23/renuncia-seremi/">Renuncia seremi de Bienes Nacionales de Arica</a>', {id:"adn-radio",url:"https://www.adnradio.cl/noticias/politica/",contentType:"text/html"});
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-10-23");
  });

  it("lee un artículo sin published_time desde su URL fechada, sin usar hoy como fecha", () => {
    const rows = parseMovementSignals('<meta property="og:title" content="Seremi de Hacienda Ronald Ruf presenta su renuncia">', {id:"diario-concepcion",url:"https://www.diarioconcepcion.cl/politica/2026/10/19/renuncia-seremi.html",contentType:"text/html"});
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-10-19");
  });

  it.each(["https://www.adnradio.cl/renuncia-seremi/", "https://www.adnradio.cl/2026/02/31/renuncia-seremi/"])("no inventa una fecha si no está disponible o es inválida: %s", (url) => {
    expect(parseMovementSignals('<meta property="og:title" content="Renuncia seremi de Salud">', {id:"adn-radio",url,contentType:"text/html"})).toHaveLength(0);
  });
});
