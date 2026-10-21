import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// En-têtes de sécurité (CONCEPTION § 7). Les scripts en ligne de Next imposent
// 'unsafe-inline' ; 'unsafe-eval' n'est utile qu'au serveur de développement.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  // Connexion : le formulaire redirige vers l'autorisation OAuth de Discord.
  "form-action 'self' https://discord.com",
  "frame-ancestors 'none'",
].join("; ");

const entetes = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:chemin*", headers: entetes }];
  },
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
