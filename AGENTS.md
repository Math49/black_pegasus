<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Black Pégasus — consignes pour tout agent (Codex, Claude…)

Projet : site public et panel d'administration du groupe **Black Pégasus Compagnie** (serveur de jeu de rôle GTA V / FiveM, argent du jeu, aucun paiement réel) et de ses filiales Location, Formation et Cards.

## À lire, dans cet ordre
1. **`CLAUDE.md`** : règles du projet. Elles s'appliquent à tout agent, pas seulement à Claude : stack, commandes, règles de code, méthode de travail.
2. **`docs/REFONTE-ADMIN.md`** : refonte de l'espace admin (phases R-1 à R-5), décisions et état. **C'est le document de travail courant.** `docs/PLAN-FILIALES.md` décrit les phases F terminées.
3. `docs/CONCEPTION-FILIALES.md` : décisions validées avec l'utilisateur pour les filiales.
4. `docs/CONCEPTION.md` : conception d'origine (schéma, transactions, sécurité). Elle fait foi pour tout ce que la conception des filiales ne change pas.
5. `docs/DEPLOIEMENT.md` : image Docker, workflow GitHub, stack Portainer, sauvegardes.
6. `docs/handoff/` : maquettes et données d'origine. **Lecture seule**, ne jamais modifier.

## Règles essentielles (détail dans CLAUDE.md)
- Interface, code métier, messages de commit et réponses à l'utilisateur **en français**.
- Argent et dates : fonctions pures dans `src/domaine/` (testées, couverture ≥ 95 %), jamais réécrites dans les écrans. Montants en dollars entiers (`Int`), affichés avec `formaterDollars`. Dates stockées en UTC, affichées dans `Parametres.fuseauServeur`.
- Toute écriture : Server Action → `exigerRole(action)` → Zod → service dans `enTransaction` → `journaliser` (libellé dans `src/services/audit.ts`), le tout enveloppé par `executer()` (`src/lib/resultat.ts`). Ne jamais faire confiance à un montant calculé par le navigateur.
- Comptabilité probante : pas de suppression ni de modification de montant sur `Mouvement` ; correction par contre-passation ; une semaine clôturée est en lecture seule ; une déclaration archivée n'est jamais régénérée.
- Couleurs : **uniquement des jetons** (`docs/handoff/design/tokens.css`, `src/styles/tokens-complementaires.css`). L'or est réservé au groupe, aux actions principales et aux chiffres clés ; le rouge d'alerte aux retards et aux actions destructrices, toujours avec icône et texte.
- Aucune valeur provisoire en dur (téléphone, horaires, tarifs, textes…) : tout vient de la base (`Parametres`, `Filiale`…).
- Accessibilité : vrais `button` / `a` / `label`, `aria-label` sur les boutons-icônes, contraste ≥ 4,5:1, cibles ≥ 44 px ; axe sans violation dans les tests e2e.
- Ne pas ajouter de fonctionnalité absente des documents sans la proposer à l'utilisateur.
- Fin de phase : `npm run lint`, `npm test`, `npm run test:e2e` et `npm run build` au vert, puis commit `phase F-n : <résumé>` et mise à jour du tableau d'état de `docs/PLAN-FILIALES.md`.

## Démarrer en local
```bash
docker compose -f docker-compose.dev.yml up -d db   # Postgres de développement (port 5432)
npm install
npx prisma migrate deploy && npx prisma generate
npm run db:seed                                     # données de démonstration (vide toutes les tables)
npm run dev                                         # http://localhost:3000 (port imposé par le retour OAuth Discord)
```
- `.env` : copier `.env.example`. `HORLOGE_DEMO` fige « maintenant » au samedi 24/10/2026 21:40 (heure de Paris) en développement, pour que les données de démonstration restent cohérentes.
- Connexion au panel en développement : `/admin/connexion` liste les comptes du seed (un bouton par compte, sans Discord). Vincent Moretti est administrateur, Lena Castillo gestionnaire, Inspecteur Daniel Hart FISC.

## Pièges techniques connus
- **Next.js 16** (`cacheComponents`, `reactCompiler`) : les données lues à la requête doivent être sous `<Suspense>`, et les lectures appellent `await connection()` (voir `src/services/site.ts`, `src/lib/garde.ts`). Modèle de page : `async function Contenu()` plus un `export default` qui l'enveloppe dans `<Suspense fallback={<ChargementPanel />}>`. Les types `PageProps<"/route">` sont générés par `npx next typegen`. Le middleware s'appelle `src/proxy.ts`. Un `redirect()` sous Suspense se fait côté navigateur : dans les tests, attendre `networkidle`.
- **Prisma 7** (client généré dans `src/generated/prisma`, adaptateur `pg`, URL assemblée par `src/lib/urlBase.ts`) : `prisma migrate dev` échoue en mode non interactif. Procédure :
  1. modifier `prisma/schema.prisma` ;
  2. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/<AAAAMMJJHHMMSS>_<nom>/migration.sql` ;
  3. ajouter à la main les étapes de reprise de données ;
  4. `npx prisma migrate deploy` puis `npx prisma generate` ;
  5. **redémarrer** `npm run dev`, sinon le client Prisma est périmé.

  Une valeur ajoutée à un enum (`ALTER TYPE … ADD VALUE`) n'est pas utilisable dans la même migration.
- Toute nouvelle table ou valeur se reporte dans `prisma/seed.ts` (TRUNCATE compris) et, si elle sert en production, dans `prisma/init-prod.ts` (lancé à chaque démarrage du conteneur, idempotent).
- Tests e2e : un seul worker. Ils supposent la base du seed et **nettoient ce qu'ils créent** (helper `sql` de `tests/e2e/outils.ts`), y compris les compteurs (`Semaine.compteurOperations`, `Compteur`), pour garder une numérotation sans trou. Ne pas lancer `npm run build` en même temps que les tests e2e.
- Windows / Git Bash : préfixer par `MSYS_NO_PATHCONV=1` les commandes qui passent des chemins commençant par `/`.
- Docker : toute nouvelle dépendance d'exécution (bibliothèque système, fichier lu au démarrage) doit être répercutée dans le `Dockerfile` (étapes `construction` / `execution`) et vérifiée par un `docker build --target execution`.
