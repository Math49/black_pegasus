# Déploiement de Black Pégasus

```text
git push sur main
   └─► GitHub Actions « Build & Push » (.github/workflows/build.yml)
          docker build (cible execution) ─► ghcr.io/math49/black_pegasus:latest
          └─► POST du webhook Portainer ─► la stack retélécharge l'image et redémarre
                 └─► au démarrage : prisma migrate deploy ─► db:init-prod ─► next start
```

Même organisation que `centrale_nai_sahp` : workflow `build.yml`, `Dockerfile` en deux étapes (`construction`, `execution`), `docker-compose.yml` de production avec `postgres`, `pgadmin`, `app` et `sauvegarde`, scripts `deploiement/`.

## GitHub

- Environnement **`VPS-Mathis`** (Settings → Environments), avec le secret **`PORTAINER_WEBHOOK`** : l'URL du webhook de la stack dans Portainer.
- L'image est poussée sur GHCR avec le `GITHUB_TOKEN` (permission `packages: write`, déclarée dans le workflow).
- Si le paquet GHCR est privé, enregistrer `ghcr.io` comme registre dans Portainer (jeton GitHub avec `read:packages`).
- Le workflow se lance à chaque push sur `main`/`master`, ou à la main (`workflow_dispatch`).

## L'image

- **Base Debian slim, pas Alpine** : Playwright ne fournit pas Chromium pour Alpine. L'image embarque **Chromium headless** et ses bibliothèques système, à la version de Playwright fixée par `package-lock.json`. Il imprime les PDF des contrats et des déclarations.
- Elle contient Prisma (client, CLI, moteur de migration) et les migrations. Elle ne contient **ni le seed de démonstration ni les tests** (exclus par `.dockerignore`).
- Elle tourne avec l'utilisateur `node` et écoute sur le port **40520**. Les fichiers (photos, justificatifs, PDF archivés) vont dans `/app/donnees/fichiers`, monté sur le volume `fichiers`.
- Commande de démarrage : migrations, puis `db:init-prod`, puis serveur. Si une étape échoue, le conteneur s'arrête plutôt que de servir une base à moitié migrée.
- Sonde de santé : `/api/sante` (l'application répond et joint la base), utilisée par le healthcheck du compose.
- Taille : environ 2,3 Go décompressée, dont environ 700 Mo pour Chromium et ses dépendances.

## La stack (`docker-compose.yml`)

| Service | Rôle | Port (local au VPS) |
|---|---|---|
| `postgres` | PostgreSQL 17 | `127.0.0.1:40521` |
| `pgadmin` | Administration de la base | `127.0.0.1:40522` |
| `app` | Black Pégasus | `127.0.0.1:40520` |
| `sauvegarde` | `pg_dump` + archive des fichiers, chaque jour à `HEURE_SAUVEGARDE` (UTC), conservés `RETENTION_JOURS` jours | — |

Les ports n'écoutent que sur `127.0.0.1` : le reverse proxy HTTPS du VPS publie `app`, et doit transmettre l'en-tête `X-Forwarded-For` (limitation de débit de la connexion).

Les variables sont décrites dans **`.env.production.example`** (à copier en `.env` à côté du compose, ou à saisir dans Portainer). Celles marquées `:?` dans le compose sont obligatoires.

| Variable | Rôle |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Base de production. |
| `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` | Connexion à pgAdmin. |
| `AUTH_URL` | Adresse publique du site. Dans le portail Discord, ajouter la redirection `<AUTH_URL>/api/auth/callback/discord`. |
| `AUTH_SECRET` | Secret Auth.js (`npx auth secret`), différent de celui du développement. |
| `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` | Application Discord (OAuth2). |
| `ADMIN_DISCORD_ID` | Premier administrateur. |
| `AGENCE_TELEPHONE`, `AGENCE_HORAIRES`, `AGENCE_IMMATRICULATION`, `SOLDE_OUVERTURE`, `FUSEAU_SERVEUR` | **Première initialisation uniquement.** Ensuite, tout se modifie dans Paramètres et ces variables sont ignorées. |
| `DISCORD_BOT_TOKEN`, `PDF_TOKEN` | Facultatifs. |
| `APP_IMAGE`, `HEURE_SAUVEGARDE`, `RETENTION_JOURS` | Valeurs par défaut fournies. |

## Premier lancement

1. Créer la stack dans Portainer à partir de `docker-compose.yml`. Les scripts du dossier `deploiement/` doivent être présents à côté (stack depuis le dépôt Git, ou fichiers copiés sur le VPS).
2. Renseigner les variables, y compris celles de première initialisation.
3. Démarrer la stack. Au premier démarrage, `db:init-prod` crée :
   - la ligne `Parametres` ;
   - les textes et le règlement de départ ;
   - les catégories ;
   - le premier administrateur ;
   - la semaine en cours, ouverte sur `SOLDE_OUVERTURE`.

   Aux démarrages suivants, il ne modifie rien.
4. L'administrateur :
   1. se connecte avec Discord ;
   2. relit **Paramètres** (textes, règlement, règles et forfaits) ;
   3. saisit la flotte dans **Véhicules** ;
   4. ajoute les gestionnaires dans **Comptes**.

**Ne jamais lancer le seed de démonstration en production** : il n'est pas dans l'image.

## Mises à jour et retour arrière

Un push sur `main` reconstruit l'image et déclenche le webhook : Portainer retélécharge `latest` et redémarre `app`, et les migrations s'appliquent au démarrage. Une migration déjà appliquée n'est jamais annulée automatiquement : avant de revenir à une version antérieure (re-push d'un ancien commit), vérifier `prisma/migrations`.

## Sauvegardes et restauration

Le service `sauvegarde` écrit chaque jour, dans le volume `sauvegardes` :
- `AAAAMMJJTHHMMSSZ.dump` : la base ;
- `AAAAMMJJTHHMMSSZ.fichiers.tar.gz` : les fichiers.

Les PDF de déclaration archivés et leur empreinte SHA-256 font foi auprès du FISC : les fichiers sont sauvegardés avec la base.

```bash
# Sauvegarde immédiate
docker compose exec sauvegarde sh /usr/local/bin/sauvegarder.sh maintenant

# Restauration (liste les sauvegardes si aucun horodatage n'est donné)
docker compose stop app
docker compose run --rm -v black-pegasus_fichiers:/cible/fichiers \
  --entrypoint /bin/sh sauvegarde /usr/local/bin/restaurer.sh 20261021T030000Z
docker compose start app
```

`restaurer.sh` :
- refuse d'écraser une base qui contient déjà des mouvements, sauf avec `FORCER=1` (ajouter `-e FORCER=1` au `run`) ;
- vérifie ensuite que chaque fichier cité par la base est présent dans le volume : photos, justificatifs, PDF de contrat et déclarations.

Tout le circuit a été testé en local le 21/10/2026 : image `execution`, stack complète sous Postgres 17, initialisation automatique puis redémarrage sans effet, sauvegarde, restauration cohérente.

## Développement

`docker compose -f docker-compose.dev.yml up -d` lance le Postgres de développement. `--profile outils` ajoute pgAdmin sur `127.0.0.1:40522`.

## Contrôles après déploiement

- Le service `app` est `healthy` dans Portainer.
- Le site public s'affiche, et le téléphone et les horaires sont ceux de Paramètres.
- La connexion Discord aboutit au tableau de bord.
- Créer un contrat de test, puis ouvrir son PDF : cela vérifie Chromium et le volume de fichiers. Annuler ensuite ce contrat (administrateur).
- Lancer une sauvegarde immédiate et vérifier les deux archives.
