import type { NextConfig } from "next";

/**
 * Configuración del rollback OpenNext conocido-bueno.
 *
 * El build Pages usa `next.config.ts` con output: export. Este archivo se
 * activa sólo por scripts/build-open-next-rollback.mjs y no forma parte del
 * artefacto estático.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    cpus: 2,
  },
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
    ],
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
