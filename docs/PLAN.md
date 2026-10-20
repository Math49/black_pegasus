# Black Pégasus – Plan de développement

Le développement est découpé en **14 phases (0 à 13)**. Chaque phase se termine par un état qui fonctionne, des tests au vert et un commit. On ne passe à la suivante qu'après validation par le client.

Pour chaque phase, donner à Claude Code le **prompt** indiqué (à copier tel quel), puis vérifier les **critères d'acceptation**.

| # | Phase | Livrable visible |
|---|---|---|
| 0 | Fondations et CI/CD | Projet qui démarre, polices et tokens chargés, page provisoire en ligne via Portainer |
| 1 | Domaine métier | Calculs de tarif, retard, semaine, comptabilité testés |
| 2 | Base de données et seed | Base remplie avec les données de démonstration |
| 3 | Design system | Page de référence des composants identique à la maquette 05 |
| 4 | Site public | Accueil, Flotte, Fiche, Règlement branchés sur la base |
| 5 | Authentification et gabarit du panel | Connexion Discord, barre latérale, en-tête |
| 6 | Comptes | Liste, ajout, activation, rôles, journal |
| 7 | Véhicules | Liste, formulaire, exemplaires, photos, visibilité |
| 8 | Contrats et PDF | Création, clôture, mouvements automatiques, PDF du contrat |
| 9 | Solde et mouvements | Historique, nouveau mouvement, justificatifs, contre-passation |
| 10 | Tableau de bord | Indicateurs, contrats en cours, graphique 8 semaines |
| 11 | Comptabilité et déclaration FISC | Registre, contrôles, clôture, PDF de déclaration |
| 12 | Paramètres du site | Textes, règlement, règles de location, catégories |
| 13 | Finitions et ouverture | Responsive, accessibilité, tests e2e, données de production, sauvegardes |

---

## Phase 0 — Fondations et CI/CD

**Prompt**
> Lis `CLAUDE.md`, `docs/CONCEPTION.md` (§ 2, 3, 8, 10) et `docs/handoff/HANDOFF.md` (§ 2). Initialise le projet : Next.js App Router + TypeScript strict, Tailwind v4, ESLint + Prettier, Vitest, Playwright Test, Prisma. Crée `docker-compose.yml` (Postgres 16 pour le développement) et `.env.example`. Mets en place la chaîne de déploiement décrite au § 12 de la conception : `Dockerfile` multi-étapes compatible Playwright, `docker-entrypoint.sh` (migrations puis serveur), route `/api/sante`, `deploy/stack.yml` pour Portainer, workflows `.github/workflows/ci.yml` et `deploy.yml` (build, push sur GHCR, appel du secret `PORTAINER_WEBHOOK_URL`). Explique-moi ensuite, étape par étape, ce que je dois configurer dans GitHub et dans Portainer. Copie les polices et images de `docs/handoff/assets/` dans `public/`, charge-les avec `next/font/local`, importe `tokens.css` et mappe les tokens dans `@theme`. Crée les utilitaires `glass-site`, `glass-admin`, `glass-modal`. Ajoute les scripts `dev`, `build`, `test`, `test:e2e`, `db:migrate`, `db:seed`. Montre-moi une page d'accueil provisoire sur fond noir avec le logo et le mot-symbole en dégradé or.

**Critères** : `docker compose up -d` puis `npm run dev` fonctionnent ; `docker build` réussit en local ; un push sur `main` passe la CI, publie l'image sur GHCR et la page provisoire apparaît sur le VPS ; polices Montserrat/Manrope chargées en local (aucune requête Google Fonts) ; aucune couleur en dur hors tokens.

---

## Phase 1 — Domaine métier (avant toute interface)

**Prompt**
> Implémente `src/domaine/` selon `docs/CONCEPTION.md` § 5 et `docs/handoff/HANDOFF.md` § 7 : argent, dates, tarif, retard, dégâts, semaine, comptabilité, numérotation, disponibilité, permissions. Fonctions pures, sans import de Prisma ni de Next. Écris d'abord les tests Vitest avec tous les cas listés au § 5 (dont le passage à l'heure d'hiver du 25/10/2026 et la synthèse de la semaine 43 calculée à partir de `docs/handoff/data/demo-semaine-43.json`), puis le code. Tous les tests doivent passer.

**Critères** : `npm test` vert ; couverture du dossier `domaine` ≥ 95 % ; la synthèse S43 retrouve $91 400 / $24 150 / $67 250 / $35 000 / $514 630.

---

## Phase 2 — Base de données et seed

**Prompt**
> Écris `prisma/schema.prisma` d'après `docs/CONCEPTION.md` § 4 (avec les tables Auth.js), crée la migration initiale, puis `prisma/seed.ts` qui importe `docs/handoff/data/flotte.json` et `demo-semaine-43.json` : catégories, véhicules, exemplaires, comptes, semaines S42 (clôturée) et S43 (ouverte), contrats, 35 mouvements, paramètres, compteurs. Applique les corrections du § 9.4 : motif de OP-43-027 renommé « Frais de représentation », véhicule « Streamer 2026 » renommé « Streamer216 » (slug `streamer216`) partout, y compris dans les libellés des mouvements. Ajoute le compte `ADMIN_DISCORD_ID` en administrateur. Termine le seed par une vérification : la synthèse S43 recalculée par le domaine doit égaler les chiffres de la maquette, sinon le seed échoue.

**Critères** : `npm run db:seed` passe sur une base vide et peut être relancé ; Prisma Studio montre des données cohérentes.

---

## Phase 3 — Design system

**Prompt**
> Crée les composants de `src/composants/ui/` listés dans `docs/handoff/HANDOFF.md` § 3 (Button gold/glass/danger/icon, GlassCard en variantes site/admin/modal, Badge de disponibilité, Statut, Chip, Tag, Field + Label, Select, Seg, Switch, DataGrid, Kpi, Modal, NavItem, Icon au trait 24 px, Rule). Reprends les valeurs exactes depuis `docs/handoff/maquettes/html/05-systeme-de-composants.html`. Monte une page `/admin/dev/composants` (non accessible en production) qui reproduit la capture `05-systeme-de-composants.png`. Respecte les règles d'accessibilité de `CLAUDE.md`.

**Critères** : la page de référence est visuellement fidèle à la capture ; navigation clavier et focus visibles ; `Switch` avec `role="switch"`.

---

## Phase 4 — Site public

**Prompt**
> Implémente le site public : en-tête et pied de page communs, puis Accueil (01), Flotte (02), Fiche véhicule (03) et Règlement (04), d'après les captures et le HTML de `docs/handoff/maquettes/`. Les données viennent de la base (véhicules visibles et non supprimés, disponibilité réelle, paramètres pour le téléphone, les horaires, les textes et le règlement). Filtres de la Flotte dans l'URL (`?type=&categorie=&places=&prixMax=&dispo=1&tri=`). Corrige le chevauchement « Hélicoptères » signalé au § 9.4 de la conception. Mise en page responsive. Métadonnées SEO et Open Graph par page.

**Critères** : les 4 pages ressemblent aux captures à 1440 px ; utilisables sur 390 px de large ; le Remorqueur (non visible) n'apparaît pas ; un exemplaire passé « Loué » change le badge sans redéploiement.

---

## Phase 5 — Authentification et gabarit du panel

**Prompt**
> Mets en place Auth.js avec Discord (scope `identify`, sessions en base) selon `docs/CONCEPTION.md` § 7 et `HANDOFF.md` § 7.10. Page de connexion (10), page « Accès non autorisé », middleware sur `/admin/**`, helpers `exigerSession` / `exigerRole`. Construis le gabarit du panel (barre latérale avec compteurs, carte de semaine, en-tête avec fil d'Ariane, cloche de notifications § 9.3, avatar et rôle) avec le fond `bg-skyline` flouté. Ajoute un mode de connexion de développement (sélection d'un compte du seed) actif uniquement si `NODE_ENV=development`.

**Critères** : un identifiant Discord inconnu ou inactif est refusé ; le gestionnaire ne voit pas « Comptes » ni « Paramètres » ; la déconnexion fonctionne.

---

## Phase 6 — Comptes

**Prompt**
> Implémente la page Comptes (21) et la modale d'ajout (22) : liste, interrupteur actif/inactif, changement de rôle, ajout par identifiant Discord avec aperçu. Règles : on ne peut pas se désactiver soi-même ni retirer le dernier administrateur actif. Chaque action écrit dans `JournalAudit` ; affiche le journal d'activité paginé en bas de la page (conception § 9.2).

**Critères** : tests unitaires des règles de protection ; journal rempli après chaque action.

---

## Phase 7 — Véhicules

**Prompt**
> Implémente la liste des véhicules (14) et le formulaire d'ajout/modification (15) : compteurs, filtre par type, recherche, interrupteur de visibilité, exemplaires (ajout, statut, suppression si jamais loué), envoi et remplacement de la photo via `services/stockage.ts` (contrôles du § 7), seuil où le journalier devient avantageux, aperçu de la carte du site, suppression logique réservée à l'administrateur. Toute modification revalide les pages publiques concernées.

**Critères** : un véhicule créé apparaît sur le site ; un fichier non image est refusé ; un exemplaire loué ne peut pas être supprimé.

---

## Phase 8 — Contrats et PDF du contrat

**Prompt**
> Implémente les contrats selon `HANDOFF.md` § 5.5 et `docs/CONCEPTION.md` § 6.1, 6.2, 6.5 : liste (16) avec onglets et recherche, création (17) avec récapitulatif recalculé en direct par `domaine/tarif.ts`, clôture (18) avec retard, dégâts et bilan, annulation par un administrateur. Toutes les écritures en transaction avec mouvements automatiques et audit. Ajoute `services/pdf.ts` (Playwright) et le gabarit `interne/pdf/contrat/[id]` d'après `30-pdf-contrat.html` ; le PDF doit ressembler à `maquettes/pdf/contrat-CTR-2026-0042.pdf`. Écris un test e2e du parcours complet : créer → PDF → clôturer avec 40 min de retard → vérifier les mouvements.

**Critères** : deux créations simultanées sur le même exemplaire → une seule réussit ; le montant enregistré ne dépend pas des valeurs envoyées par le navigateur ; le PDF est téléchargeable.

---

## Phase 9 — Solde et mouvements

**Prompt**
> Implémente la page Solde (12) et la modale « Nouveau mouvement » (13) : solde et courbe de la semaine, cartes Entrées/Sorties, historique filtrable et paginé, justificatif obligatoire pour les dépenses (numéroté `JUST-SS-NN`), aperçu du justificatif, imputation à la semaine selon la conception § 6.3, règles de correction et contre-passation § 6.5. Les mouvements automatiques ne sont pas modifiables.

**Critères** : impossible de supprimer un mouvement ou d'en changer le montant ; la numérotation reste continue ; un justificatif n'est pas accessible sans session.

---

## Phase 10 — Tableau de bord

**Prompt**
> Implémente le tableau de bord (11) : solde en or et évolution de la semaine, raccourcis, quatre indicateurs, contrats en cours triés par heure de retour avec ligne d'alerte et « Retard · 40 min », graphique des recettes des 8 dernières semaines (semaine en cours en or). Toutes les valeurs viennent de `domaine/comptabilite.ts`.

**Critères** : avec le seed, les chiffres égalent ceux de la capture 11.

---

## Phase 11 — Comptabilité hebdomadaire et déclaration FISC

**Prompt**
> Implémente la comptabilité (19) et la confirmation de clôture (20) selon `HANDOFF.md` § 5.6 et § 7.6 et `docs/CONCEPTION.md` § 6.6 : sélecteur de semaine, synthèse, contrôles avant clôture, registre filtrable (Toutes / Recettes / Dépenses / Cautions) avec totaux, export CSV, brouillon PDF filigrané pour les gestionnaires, clôture administrateur avec saisie de `CLÔTURER S43`, verrouillage, ouverture de la semaine suivante, génération et empreinte SHA-256 du PDF de déclaration d'après les gabarits 31–32 et `maquettes/pdf/declaration-FISC-S43.pdf`.

**Critères** : une semaine clôturée refuse toute écriture ; le PDF archivé n'est jamais régénéré ; le solde d'ouverture de S44 = solde de clôture de S43 ; test e2e de la clôture.

---

## Phase 12 — Paramètres du site

**Prompt**
> Implémente `/admin/parametres` décrit au § 9.1 de `docs/CONCEPTION.md`, sans maquette : compose l'écran avec les composants existants, dans le style du formulaire véhicule (15). Sections Agence, Textes du site, Règlement (articles ordonnables en markdown), Règles de location, Catégories. Administrateur uniquement. Chaque enregistrement revalide le site public et écrit dans le journal. Montre-moi une capture avant d'affiner.

**Critères** : modifier le téléphone ou un article du règlement se voit immédiatement sur le site ; une catégorie utilisée ne peut pas être supprimée.

---

## Phase 13 — Finitions et mise en ligne

**Prompt**
> Fais une passe de finition : responsive du site public (390, 768, 1024, 1440 px), audit d'accessibilité (axe) sans erreur, états vides et de chargement, pages 404 et 500 dans le style du site, en-têtes de sécurité, limitation de débit. Complète les tests e2e (site public, connexion refusée, contrat complet, clôture de semaine). Écris le script `db:init-prod` (§ 12 « Données en production »), ajoute à la stack Portainer la sauvegarde quotidienne de Postgres et du volume `/data`, et rédige `docs/DEPLOIEMENT.md` (configuration GitHub et Portainer, premier lancement, restauration, retour à une version précédente via l'étiquette `sha-…`).

**Critères** : `npm run build` sans avertissement ; Lighthouse ≥ 90 (performance, accessibilité) sur l'accueil ; restauration d'une sauvegarde testée.

---

## Avant de commencer : à fournir ou valider

- Les décisions encore ouvertes de `docs/CONCEPTION.md` § 11 (D4 à D7a), sinon les valeurs par défaut s'appliquent.
- Le dépôt GitHub (et s'il est privé ou public).
- Une stack Portainer prête à recevoir `deploy/stack.yml`, avec son webhook, et le nom du réseau de ton reverse proxy si l'app doit s'y raccorder.
- Une application Discord (portail développeur) : identifiant et secret client, URL de redirection `https://<domaine>/api/auth/callback/discord`.
- L'identifiant Discord du premier administrateur.
- Le nom de domaine pointé vers le VPS.
- Plus tard : les vraies photos des véhicules (captures en jeu) et les textes définitifs.
