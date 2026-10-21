# Déploiement de Black Pégasus

Le déploiement se fait **à la main** : pas de CI/CD, de Dockerfile ni de stack Portainer fournis (décision du client). Ce document décrit ce dont l'application a besoin pour tourner en production.

## Prérequis

- **Node.js 22** (ou plus récent) et npm.
- **PostgreSQL 16**.
- **Chromium pour Playwright**, qui imprime les PDF des contrats et des déclarations :
  ```bash
  npx playwright install --with-deps chromium
  ```
- Un reverse proxy HTTPS devant l'application (port 3000 par défaut). Il doit transmettre `X-Forwarded-For`, utilisé par la limitation de débit.
- Un dossier persistant pour les fichiers (photos, justificatifs, PDF archivés), indiqué par `STOCKAGE_DIR`.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL. |
| `AUTH_SECRET` | Secret Auth.js. Le générer avec `npx auth secret` ; ne jamais réutiliser celui du développement. |
| `AUTH_URL` | Adresse publique du site, par exemple `https://black-pegasus.exemple`. |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Application Discord (OAuth2). Ajouter la redirection `https://<domaine>/api/auth/callback/discord` dans le portail Discord. |
| `ADMIN_DISCORD_ID` | Identifiant Discord du premier administrateur (utilisé par `db:init-prod`). |
| `STOCKAGE_DIR` | Dossier persistant des fichiers. |
| `PDF_TOKEN` | Jeton des pages internes imprimées en PDF : une longue chaîne aléatoire. Vide, un jeton est tiré à chaque démarrage, ce qui suffit pour une instance unique. |
| `URL_INTERNE` | Facultatif. Adresse à laquelle le serveur se joint lui-même pour imprimer les PDF (par défaut `http://127.0.0.1:$PORT`). |
| `DISCORD_BOT_TOKEN` | Facultatif. Permet l'aperçu du compte Discord dans la modale d'ajout de compte. |

`HORLOGE_DEMO` ne sert qu'au développement ; elle est ignorée quand `NODE_ENV=production`.

## Premier lancement

```bash
npm ci
npm run build
npm run db:deploy
npm run db:init-prod -- --telephone 555-0100 --horaires "Tous les jours · 14h – 02h" --immatriculation "SA-000000" --solde 250000
NODE_ENV=production npm run start
```

- `db:deploy` applique les migrations Prisma.
- `db:init-prod` crée uniquement ce qui manque, et sa relance ne modifie rien :
  - la ligne `Parametres` (téléphone, horaires, n° d'immatriculation, fuseau via `--fuseau`, `Europe/Paris` par défaut) ;
  - les textes et le règlement de départ ;
  - les catégories ;
  - le premier administrateur ;
  - la semaine en cours, ouverte sur le solde de caisse indiqué par `--solde`.

  Le script utilise `tsx`, une dépendance de développement : il faut l'installer, ou lancer le script depuis un poste qui a accès à la base.
- **Ne jamais lancer `npm run db:seed` en production** : il vide toutes les tables. Il refuse de tourner quand `NODE_ENV=production`.

Ensuite, l'administrateur :
1. se connecte avec Discord ;
2. relit **Paramètres** (textes, règlement, règles et forfaits de dégâts) ;
3. saisit la flotte dans **Véhicules** ;
4. ajoute les gestionnaires dans **Comptes**.

## Mise à jour

```bash
git pull
npm ci
npm run build
npm run db:deploy
# puis redémarrer le processus (systemd, pm2…)
```

Pour revenir à une version précédente, refaire ces étapes après `git checkout <commit>`. Une migration déjà appliquée n'est jamais annulée automatiquement : vérifier dans `prisma/migrations` avant de revenir en arrière au-delà d'un changement de schéma.

## Sauvegardes

Sauvegarder chaque jour **la base et le dossier `STOCKAGE_DIR`**, et conserver 14 jours d'archives. Les PDF de déclaration archivés et leur empreinte SHA-256 font foi auprès du FISC.

Exemple de tâche cron quotidienne :

```bash
# /etc/cron.d/black-pegasus : tous les jours à 05:00
0 5 * * * bp pg_dump -Fc "$DATABASE_URL" -f /sauvegardes/bp-$(date +\%F).dump && tar -czf /sauvegardes/fichiers-$(date +\%F).tar.gz -C /srv/black-pegasus data && find /sauvegardes -mtime +14 -delete
```

## Restauration

```bash
createdb black_pegasus_restauree
pg_restore --no-owner -d black_pegasus_restauree /sauvegardes/bp-AAAA-MM-JJ.dump
tar -xzf /sauvegardes/fichiers-AAAA-MM-JJ.tar.gz -C /srv/black-pegasus
```

Pointer ensuite `DATABASE_URL` vers la base restaurée et redémarrer. La procédure a été testée en développement le 21/10/2026 : `pg_dump -Fc` puis `pg_restore` ont redonné les mêmes mouvements, les mêmes contrats et le même solde. La tester une fois sur le serveur avant l'ouverture.

## Contrôles après déploiement

- Le site public s'affiche, et le téléphone et les horaires sont ceux de Paramètres.
- La connexion Discord aboutit au tableau de bord.
- Créer un contrat de test, puis ouvrir son PDF : cela vérifie Chromium et `STOCKAGE_DIR`. Annuler ensuite ce contrat (administrateur).
- Les en-têtes de sécurité (CSP, `X-Frame-Options`, HSTS) sont présents dans les réponses.
