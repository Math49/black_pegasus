import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  experimental: {
    // Photos et justificatifs : 10 Mo maximum (CONCEPTION § 7) + marge multipart.
    serverActions: { bodySizeLimit: "11mb" },
  },
  images: {
    // Photos des véhicules servies par /api/fichiers, visuels fixes dans /public/images.
    localPatterns: [{ pathname: "/api/fichiers/photos/**" }, { pathname: "/images/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
