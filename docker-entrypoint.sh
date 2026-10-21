#!/bin/sh
# Démarrage du conteneur : migrations Prisma, puis serveur Next.js. Si une migration échoue,
# le conteneur s'arrête au lieu de servir une application à moitié migrée.
set -e
node_modules/.bin/prisma migrate deploy
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
