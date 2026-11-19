const OFFICIAL_DOMAINS = ["gob.cl", "gov.cl", "camara.cl", "congreso.cl", "senado.cl", "bcn.cl", "consejotransparencia.cl", "portaltransparencia.cl", "infoprobidad.cl", "infolobby.cl", "servel.cl", "mercadopublico.cl", "chilecompra.cl", "sinim.cl", "ine.cl", "censo2024.cl", "contraloria.cl", "presidencia.cl", "hacienda.cl", "sii.cl", "registrocivil.cl"];
export function officialReference(value: unknown): string | null {
    if (typeof value !== "string")
        return null;
    try {
        const url = new URL(value);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !OFFICIAL_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith("." + domain)))
            return null;
        url.protocol = "https:";
        return url.href;
    }
    catch {
        return null;
    }
}
export function sourceAccessDestination(href: string | undefined) { const source = officialReference(href); return source ? "/fuentes/?referencia=" + encodeURIComponent(source) : href; }
