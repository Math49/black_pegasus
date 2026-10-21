# Image de production de Black Pégasus : Next.js + Prisma + Chromium (PDF via Playwright).
# Base Debian et non Alpine : Playwright ne fournit pas Chromium pour Alpine.

FROM node:22-bookworm-slim AS construction

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
# Le build ne se connecte pas à la base ; Prisma exige seulement une URL bien formée.
ENV DATABASE_URL="postgresql://construction:construction@localhost:5432/construction" \
    NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate

COPY . .
RUN npm run build && rm -rf .next/cache


FROM node:22-bookworm-slim AS execution

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=40520 \
    STOCKAGE_DIR=/app/donnees/fichiers \
    AUTH_TRUST_HOST=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Prisma : openssl et moteur de migration, téléchargé ici car l'utilisateur d'exécution
# n'écrit pas dans node_modules. Chromium (navigateur headless seul, suffisant pour les PDF) :
# bibliothèques système comprises, à la version de Playwright du package-lock.
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && npm ci --omit=dev --no-audit --no-fund --ignore-scripts \
  && node node_modules/@prisma/engines/scripts/postinstall.js \
  && npx playwright install --with-deps --only-shell chromium \
  && npm cache clean --force \
  && rm -rf /var/lib/apt/lists/*

COPY prisma ./prisma
COPY prisma.config.ts next.config.ts ./
COPY --from=construction /app/src/generated ./src/generated
# Domaine : utilisé par l'initialisation de production (prisma/init-prod.ts).
COPY --from=construction /app/src/domaine ./src/domaine
COPY --from=construction /app/public ./public
COPY --from=construction --chown=node:node /app/.next ./.next

RUN mkdir -p /app/donnees/fichiers && chown -R node:node /app/donnees

USER node

EXPOSE 40520

# Migrations, initialisation de production (sans effet si déjà faite), puis serveur.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && npm run --silent db:init-prod && exec node_modules/.bin/next start -H 0.0.0.0 -p \"$PORT\""]
