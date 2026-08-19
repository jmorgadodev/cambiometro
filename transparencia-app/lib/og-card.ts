function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

export function createOgSvg(input: {
  title: string;
  subtitle: string;
  freshness: string;
  metric: string;
  metricTone?: "info" | "warning";
}): string {
  const title = escapeXml(input.title);
  const subtitle = escapeXml(input.subtitle);
  const freshness = escapeXml(input.freshness);
  const metric = escapeXml(input.metric);
  const metricColor = input.metricTone === "warning" ? "#fbbf24" : "#38bdf8";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#071426"/>
  <rect x="64" y="64" width="8" height="502" rx="4" fill="#38bdf8"/>
  <text x="104" y="112" fill="#38bdf8" font-family="Arial, sans-serif" font-size="26" font-weight="700">EL CAMBIÓMETRO</text>
  <text x="104" y="230" fill="#f8fafc" font-family="Arial, sans-serif" font-size="52" font-weight="700">${title}</text>
  <text x="104" y="285" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28">${subtitle}</text>
  <text x="104" y="535" fill="#94a3b8" font-family="Arial, sans-serif" font-size="20">${freshness}</text>
  <text x="1090" y="535" text-anchor="end" fill="${metricColor}" font-family="Arial, sans-serif" font-size="24" font-weight="700">${metric}</text>
</svg>`;
}

export function svgResponse(svg: string): Response {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
