import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  // Cada worker carga el snapshot ETL oficial (~493 MB). Limitar la concurrencia
  // evita que la generación estática multiplique ese consumo hasta agotar memoria.
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
