# Déploiement de Black Pégasus

L'application est livrée sous forme d'**image Docker**, que le client déploie lui-même sur son VPS. Aucun pipeline CI/CD ni aucune stack Portainer n'est fourni.

## L'image

Le `Dockerfile` à la racine produit une image Node 22 (Debian slim). Elle contient :
- l'application Next.js déjà construite ;
- Prisma (client, CLI et moteur de migration) et les migrations ;
- **Chromium en version headless**, avec ses bibliothèques système. Playwright s'en sert pour imprimer les PDF des contrats et des déclarations ; il est installé à la version de Playwright fixée par `package-lock.json` ;
- le script `db:init-prod`.

Elle ne contient **ni le seed de démonstration ni les tests** (exclus par `.dockerignore`).

Au démarrage, `docker-entrypoint.sh` applique les migrations (`prisma migrate deploy`), puis lance `next start`. Si une migration échoue, le conteneur s'arrête au lieu de servir une application à moitié migrée.

Autres caractéristiques :
- exécution avec l'utilisateur non root `node` ;
- port 3000 ;
- volume `/data` pour les fichiers (photos, justificatifs, PDF archivés) ;
- `HEALTHCHECK` sur `/api/sante`, qui vérifie aussi la connexion à la base.

Taille : environ 2,3 Go décompressée, dont environ 700 Mo pour Chromium et ses dépendances.

```bash
docker build -t black-pegasus:1.0.0 .
```

Pour l'envoyer sur le VPS, deux possibilités :
- **Avec un registre** : `docker tag` puis `docker push` vers le registre du client.
- **Sans registre** : `docker save black-pegasus:1.0.0 | gzip > bp.tar.gz`, puis sur le VPS `gunzip -c bp.tar.gz | docker load`.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL. |
| `AUTH_SECRET` | Secret Auth.js. Le générer avec `npx auth secret` ; ne jamais réutiliser celui du développement. |
| `AUTH_URL` | Adresse publique du site, par exemple `https://black-pegasus.exemple`. |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Application Discord (OAuth2). Ajouter la redirection `https://<domaine>/api/auth/callback/discord` dans le portail Discord. |
| `ADMIN_DISCORD_ID` | Identifiant Discord du premier administrateur (utilisé par `db:init-prod`). |
| `PDF_TOKEN` | Facultatif. Jeton des pages internes imprimées en PDF. Vide, un jeton aléatoire est tiré à chaque démarrage, ce qui suffit pour un conteneur unique. |
| `DISCORD_BOT_TOKEN` | Facultatif. Permet l'aperçu du compte Discord dans la modale d'ajout de compte. |

Déjà fixées dans l'image : `NODE_ENV=production`, `PORT=3000`, `STOCKAGE_DIR=/data`, `AUTH_TRUST_HOST=true` (l'application tourne derrière un reverse proxy) et `PLAYWRIGHT_BROWSERS_PATH`. `HORLOGE_DEMO` est ignorée en production.

Le reverse proxy HTTPS doit transmettre `X-Forwarded-For`, utilisé par la limitation de débit de la connexion.

## Exemple de `docker-compose.yml` sur le VPS

```yaml
services:
  app:
    image: black-pegasus:1.0.0
    restart: unless-stopped
    env_file: .env.production
    environment:
      DATABASE_URL: postgresql://bp:${POSTGRES_PASSWORD}@db:5432/black_pegasus
    volumes:
      - fichiers:/data
    ports:
      - "127.0.0.1:3000:3000"   # exposé au seul reverse proxy local
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: bp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: black_pegasus
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bp -d black_pegasus"]
      interval: 5s
      retries: 10
volumes:
  pgdata:
  fichiers:
```

Postgres n'est pas publié à l'extérieur.

## Premier lancement

```bash
docker compose up -d
docker compose exec app npm run db:init-prod -- --telephone 555-0100 --horaires "Tous les jours · 14h – 02h" --immatriculation "SA-000000" --solde 250000
```

`db:init-prod` crée uniquement ce qui manque, et sa relance ne modifie rien :
- la ligne `Parametres` (téléphone, horaires, n° d'immatriculation, fuseau via `--fuseau`, `Europe/Paris` par défaut) ;
- les textes et le règlement de départ ;
- les catégories ;
- le premier administrateur (`ADMIN_DISCORD_ID`) ;
- la semaine en cours, ouverte sur le solde de caisse indiqué par `--solde`.

**Ne jamais lancer le seed de démonstration en production.** Il n'est d'ailleurs pas présent dans l'image.

Ensuite, l'administrateur :
1. se connecte avec Discord ;
2. relit **Paramètres** (textes, règlement, règles et forfaits de dégâts) ;
3. saisit la flotte dans **Véhicules** ;
4. ajoute les gestionnaires dans **Comptes**.

## Mise à jour

Construire et transférer la nouvelle image, changer l'étiquette dans le `docker-compose.yml`, puis lancer `docker compose up -d`. Les migrations s'appliquent au démarrage.

Pour revenir en arrière, relancer avec l'étiquette précédente. Une migration déjà appliquée n'est jamais annulée automatiquement : vérifier `prisma/migrations` avant de revenir au-delà d'un changement de schéma.

## Sauvegardes

Sauvegarder chaque jour **la base et le volume `fichiers`**, et conserver 14 jours d'archives. Les PDF de déclaration archivés et leur empreinte SHA-256 font foi auprès du FISC.

Exemple de tâche cron sur le VPS, lancée depuis le dossier du `docker-compose.yml` :

```bash
0 5 * * * cd /srv/black-pegasus && docker compose exec -T db pg_dump -U bp -Fc black_pegasus > /sauvegardes/bp-$(date +\%F).dump && docker run --rm -v black-pegasus_fichiers:/data -v /sauvegardes:/s debian:bookworm-slim tar -czf /s/fichiers-$(date +\%F).tar.gz -C /data . && find /sauvegardes -mtime +14 -delete
```

Le nom du volume (`black-pegasus_fichiers`) dépend du nom du dossier du projet : vérifier avec `docker volume ls`.

## Restauration

```bash
docker compose stop app
docker compose exec -T db dropdb -U bp black_pegasus
docker compose exec -T db createdb -U bp black_pegasus
docker compose exec -T db pg_restore -U bp --no-owner -d black_pegasus < /sauvegardes/bp-AAAA-MM-JJ.dump
docker run --rm -v black-pegasus_fichiers:/data -v /sauvegardes:/s debian:bookworm-slim tar -xzf /s/fichiers-AAAA-MM-JJ.tar.gz -C /data
docker compose start app
```

La restauration `pg_dump -Fc` puis `pg_restore` a été testée en développement le 21/10/2026 : mêmes mouvements, mêmes contrats et même solde. La tester une fois sur le VPS avant l'ouverture.

## Contrôles après déploiement

- `docker compose ps` affiche l'application `healthy`.
- Le site public s'affiche, et le téléphone et les horaires sont ceux de Paramètres.
- La connexion Discord aboutit au tableau de bord.
- Créer un contrat de test, puis ouvrir son PDF : cela vérifie Chromium et le volume `/data`. Annuler ensuite ce contrat (administrateur).
- Les en-têtes de sécurité (CSP, `X-Frame-Options`, HSTS) sont présents dans les réponses.
