# Black Pégasus – American Transports

Site public et panel d'administration d'une agence de location de bateaux, d'avions et d'hélicoptères sur un serveur de jeu de rôle GTA V (FiveM). Entreprise fictive : argent du jeu, aucun paiement réel.

## Documents de référence (lire avant de coder)
1. `docs/PLAN.md` — phases de développement. **Travailler une phase à la fois**, dans l'ordre.
2. `docs/CONCEPTION.md` — décisions techniques, schéma, transactions, sécurité. **Prime sur le HANDOFF** en cas d'écart.
3. `docs/handoff/HANDOFF.md` — spécification fonctionnelle et visuelle de Claude Design (écrans, règles de calcul § 7).
4. `docs/handoff/maquettes/captures/*.png` et `maquettes/html/*.html` — référence visuelle ; reprendre les valeurs exactes du CSS des pages HTML.
5. `docs/handoff/design/tokens.css` — seules couleurs, ombres, recettes de verre et polices autorisées.
6. `docs/handoff/data/*.json` — données du seed.

Le dossier `docs/handoff/` est en **lecture seule** : ne pas le modifier.

## Stack
Next.js (App Router, TypeScript strict) · Tailwind v4 · Prisma + PostgreSQL · Auth.js (Discord) · Zod · date-fns + @date-fns/tz · Playwright (PDF et tests e2e) · Vitest.

## Commandes
- `docker compose up -d` — Postgres de développement
- Production : déploiement géré à la main par le client ; ne pas créer de CI/CD, Dockerfile ni stack Portainer (le § 12 de la conception ne s'applique pas). Ne jamais lancer le seed de démonstration en production.
- `npm run dev` · `npm run build` · `npm run lint`
- `npm test` (Vitest) · `npm run test:e2e` (Playwright)
- `npm run db:migrate` · `npm run db:seed`

## Règles de code
- Toute la logique d'argent et de dates est dans `src/domaine/` (fonctions pures, testées). Les écrans et services l'appellent, ne la réécrivent jamais.
- Toutes les écritures : Server Action → `exigerRole` → Zod → service en transaction → `JournalAudit`. Ne jamais faire confiance à un montant calculé par le navigateur.
- Comptabilité probante : aucun `delete` ni modification de montant sur `Mouvement` ; corrections par contre-passation. Une semaine clôturée est en lecture seule.
- Montants en dollars entiers (`Int`), affichés `$28 000` via `formaterDollars`. Dates en UTC, affichées dans le fuseau `Parametres.fuseauServeur`.
- Aucune valeur provisoire ou **[À VALIDER]** en dur (téléphone, horaires, tarifs, forfaits, tolérance…) : tout vient de `Parametres` ou de la base.
- Aucune couleur en dur : uniquement les tokens. Or réservé aux actions principales, prix et chiffres clés ; alerte seulement pour retards et actions destructrices, toujours avec icône + texte.
- Interface et code métier en français (noms de modèles, champs, messages) ; commentaires concis.
- Accessibilité : vrais `button` / `a` / `label`, `aria-label` sur les boutons-icônes, contraste ≥ 4,5:1, cibles ≥ 44 px.
- Ne pas ajouter de fonctionnalité absente des documents sans la proposer d'abord.

## Méthode de travail
- En début de phase : résumer ce qui va être fait et signaler toute ambiguïté avant d'écrire du code.
- Pour un écran : ouvrir la capture **et** le HTML de la maquette, puis comparer le rendu final à la capture (capture d'écran Playwright).
- En fin de phase : `npm run lint`, `npm test` et `npm run build` au vert, puis un commit `phase N : <résumé>` et la liste de ce qui reste à valider.
