import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://cambiometro.impulsacv.cl";

  return {
    rules: [
      { userAgent: "*", allow: ["/", "/api/og/"], disallow: ["/api/", "/_next/"] },
      { userAgent: ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"], disallow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
