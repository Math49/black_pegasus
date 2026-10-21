# Image de production de Black Pégasus : Next.js + Prisma + Chromium (PDF via Playwright).
# Construction : docker build -t black-pegasus .

# ── Dépendances (toutes, pour le build) ───────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ── Build ─────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le build ne se connecte pas à la base ; Prisma exige seulement une URL bien formée.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build && rm -rf .next/cache

# ── Exécution ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    STOCKAGE_DIR=/data \
    AUTH_TRUST_HOST=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
# Prisma : openssl et moteur de migration, téléchargé ici car l'utilisateur d'exécution
# n'écrit pas dans node_modules. Chromium (navigateur headless seul, suffisant pour les PDF) :
# bibliothèques système comprises, à la version de Playwright du package-lock.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && npm ci --omit=dev --ignore-scripts \
    && node node_modules/@prisma/engines/scripts/postinstall.js \
    && npx playwright install --with-deps --only-shell chromium \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts /app/prisma.config.ts ./
COPY --from=build /app/prisma ./prisma
# Client Prisma généré, et domaine pour db:init-prod (lancé depuis la console du conteneur).
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/src/domaine ./src/domaine
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
    && mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/sante').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["./docker-entrypoint.sh"]
