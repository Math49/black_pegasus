# Black Pégasus – Conception technique

Ce document traduit la spécification de Claude Design (`docs/handoff/HANDOFF.md`) en décisions techniques. Il **complète** le HANDOFF : écrans, design et règles de calcul y restent décrits. En cas de contradiction, **ce document l'emporte**, car il intègre des décisions prises après les maquettes (§ 9).

---

## 1. Périmètre

| Espace | Contenu |
|---|---|
| Site public | Accueil, Flotte (bateaux, avions, hélicoptères), Fiche véhicule, Règlement. Aucune réservation en ligne : on appelle l'agence en jeu. |
| Panel privé | Connexion Discord, Tableau de bord, Solde, Véhicules, Contrats, Comptabilité hebdomadaire (FISC), Comptes, **Paramètres du site** (ajouté, § 9.1). |

Hors périmètre (décidé avec le client) : employés, pointeuse, salaires, réservation en ligne, webhooks Discord, synchronisation avec le serveur FiveM. Tout est saisi à la main dans le panel.

---

## 2. Stack retenue

| Besoin | Choix | Raison |
|---|---|---|
| Framework | **Next.js** (dernière version stable, App Router, TypeScript strict) | Site public et panel dans une seule application, rendu serveur pour le SEO du site |
| Style | **Tailwind CSS v4** + `docs/handoff/design/tokens.css` exposés via `@theme` | Les tokens deviennent des classes ; les recettes de verre deviennent des utilitaires `glass-site`, `glass-admin`, `glass-modal` |
| Base de données | **PostgreSQL 16** + **Prisma** | Transactions fiables pour la comptabilité |
| Authentification | **Auth.js** (fournisseur Discord, scope `identify`), sessions en base | Pas de mot de passe ; accès limité aux comptes autorisés |
| Validation | **Zod** (formulaires et Server Actions) | Mêmes schémas côté client et serveur |
| Dates | **date-fns** + **@date-fns/tz** | Fuseau du serveur de jeu paramétrable, durées calculées sur des instants UTC |
| PDF | **Playwright** (Chromium headless) : rendu d'une route HTML interne → PDF | Réutilise directement les gabarits 30, 31 et 32 |
| Fichiers | Disque local (volume Docker) derrière une interface `Stockage` | Remplaçable par S3 plus tard sans toucher au métier |
| Graphiques | **Recharts** (ou SVG maison pour les deux graphiques simples) | Courbe du solde, barres des 8 semaines |
| Tests | **Vitest** (domaine), **Playwright Test** (parcours de bout en bout) | |
| Hébergement | **VPS du client géré par Portainer** : stack app + Postgres + volume fichiers | Validé ; Playwright et le stockage disque y fonctionnent sans contrainte |
| CI/CD | **GitHub Actions** → image Docker poussée sur **GHCR** → **webhook Portainer** qui redéploie la stack | Validé (§ 12) |

---

## 3. Architecture

```text
Navigateur ──► Next.js
                ├── (public)   pages serveur, lecture seule, cache revalidé à chaque modification
                ├── (admin)    pages serveur protégées + Server Actions (toutes les écritures)
                ├── api/auth   Auth.js (Discord)
                ├── api/fichiers/[...] servir photos (public) et justificatifs (authentifié)
                └── interne/pdf/*  gabarits HTML imprimables (accès par jeton interne)
                        │
                 src/domaine  ← logique métier PURE (aucun import Prisma/Next)
                 src/services ← orchestration en transaction (Prisma + domaine + audit)
                        │
                 PostgreSQL        Volume /data (photos, justificatifs, PDF)
```

Principe clé : **tous les calculs d'argent et de dates vivent dans `src/domaine`**, en fonctions pures testées. Les écrans et les services ne font qu'appeler ces fonctions. Le récapitulatif en direct du formulaire de contrat utilise **la même fonction** côté client que celle qui enregistre côté serveur.

### Structure du dépôt

```text
/
├── CLAUDE.md
├── docs/  CONCEPTION.md · PLAN.md · handoff/ (dossier Claude Design, lecture seule)
├── prisma/  schema.prisma · seed.ts (lit docs/handoff/data/*.json)
├── public/  fonts/ · images/ (copiés depuis docs/handoff/assets)
├── src/
│   ├── app/
│   │   ├── (public)/  page.tsx · flotte/ · flotte/[slug]/ · reglement/
│   │   ├── admin/connexion/
│   │   ├── admin/(panel)/  layout.tsx · page.tsx · solde/ · vehicules/ · contrats/ · comptabilite/ · comptes/ · parametres/
│   │   ├── interne/pdf/  contrat/[id]/ · declaration/[semaine]/
│   │   └── api/  auth/[...nextauth]/ · fichiers/[...chemin]/
│   ├── composants/  ui/ (Button, GlassCard, Badge, Chip, Field, Seg, Switch, Modal, DataGrid, Kpi, Icon…) · site/ · admin/
│   ├── domaine/  argent.ts · dates.ts · tarif.ts · retard.ts · degats.ts · semaine.ts · comptabilite.ts · numerotation.ts · disponibilite.ts · permissions.ts (+ *.test.ts)
│   ├── services/  contrats.ts · mouvements.ts · semaines.ts · vehicules.ts · comptes.ts · parametres.ts · pdf.ts · stockage.ts · audit.ts
│   └── lib/  prisma.ts · auth.ts · garde.ts (exigerSession / exigerRole)
├── tests/e2e/
├── .github/workflows/  ci.yml · deploy.yml
├── Dockerfile · docker-entrypoint.sh · .dockerignore
├── docker-compose.yml (développement : Postgres seul) · deploy/stack.yml (production, pour Portainer)
├── .env.example
```

---

## 4. Modèle de données (Prisma)

Montants : `Int` en dollars entiers. Dates : `DateTime` (UTC). Noms en français, alignés sur le HANDOFF § 6.

```prisma
enum TypeVehicule   { BATEAU AVION HELICOPTERE }
enum StatutExemplaire { DISPONIBLE LOUE MAINTENANCE }
enum StatutContrat  { EN_COURS TERMINE ANNULE }
enum TarifApplique  { HORAIRE JOURNALIER }
enum Sens           { ENTREE SORTIE }
enum CategorieMouvement { LOCATION PENALITE CAUTION_ENCAISSEE CAUTION_RENDUE ACHAT_VEHICULE ENTRETIEN IMPOTS APPORT DIVERS }
enum StatutSemaine  { OUVERTE CLOTUREE }
enum Role           { ADMIN GESTIONNAIRE }

model Categorie {            // liste gérée dans Paramètres (filtres cohérents sur le site)
  id String @id @default(cuid())
  type TypeVehicule
  nom String
  ordre Int @default(0)
  vehicules Vehicule[]
  @@unique([type, nom])
}

model Vehicule {
  id String @id @default(cuid())
  slug String @unique
  nom String
  type TypeVehicule
  categorieId String
  categorie Categorie @relation(fields: [categorieId], references: [id])
  places Int
  contenanceKg Int
  prixHeure Int
  prixJour Int
  caution Int
  photo String?            // clé de stockage
  galerie String[]
  description String @default("")
  visibleSurSite Boolean @default(true)
  supprimeLe DateTime?     // suppression logique : l'historique des contrats reste lisible
  exemplaires Exemplaire[]
  creeLe DateTime @default(now())
  modifieLe DateTime @updatedAt
  modifieParId String?
}

model Exemplaire {
  id String @id @default(cuid())
  vehiculeId String
  vehicule Vehicule @relation(fields: [vehiculeId], references: [id])
  immatriculation String @unique
  statut StatutExemplaire @default(DISPONIBLE)
  note String?
  contrats Contrat[]
}

model Contrat {
  id String @id @default(cuid())
  numero String @unique          // CTR-2026-0042
  clientNom String
  clientTelephone String
  exemplaireId String
  exemplaire Exemplaire @relation(fields: [exemplaireId], references: [id])
  // instantanés figés à la signature (le contrat ne bouge pas si les tarifs changent)
  vehiculeNom String
  prixHeure Int
  prixJour Int
  debut DateTime
  finPrevue DateTime
  heuresFacturees Int
  tarifApplique TarifApplique
  montantLocation Int
  caution Int
  statut StatutContrat @default(EN_COURS)
  retourReel DateTime?
  retardMinutes Int?
  penaliteRetard Int?
  penaliteDegats Int?
  degats Json?                   // [{ libelle, montant }]
  cautionRestituee Int?
  noteEtatDesLieux String?
  pdf String?
  creeParId String
  clotureParId String?
  creeLe DateTime @default(now())
  mouvements Mouvement[]
}

model Mouvement {
  id String @id @default(cuid())
  numero String @unique          // OP-43-012 (préfixé de l'année en base : 2026-OP-43-012, voir § 6.4)
  semaineId String
  semaine Semaine @relation(fields: [semaineId], references: [id])
  date DateTime                  // date réelle de l'opération
  sens Sens
  categorie CategorieMouvement
  montant Int                    // toujours positif, le sens porte le signe
  motif String
  contratId String?
  contrat Contrat? @relation(fields: [contratId], references: [id])
  justificatif String?           // clé de stockage
  justificatifNumero String?     // JUST-43-03
  automatique Boolean @default(false)   // généré par un contrat : non modifiable à la main
  annuleMouvementId String? @unique     // contre-passation (§ 6.5)
  saisiParId String
  saisiPar Compte @relation(fields: [saisiParId], references: [id])
  creeLe DateTime @default(now())
}

model Semaine {
  id String @id                  // "2026-S43" (semaine ISO, lundi → dimanche)
  annee Int
  numero Int
  debut DateTime                 // lundi 00:00 heure serveur, en UTC
  fin DateTime                   // lundi suivant 00:00 (borne exclusive)
  statut StatutSemaine @default(OUVERTE)
  soldeOuverture Int
  soldeCloture Int?
  clotureeLe DateTime?
  clotureeParId String?
  declarationPdf String?
  declarationSha256 String?      // empreinte du PDF remis au FISC
  compteurOperations Int @default(0)
  compteurJustificatifs Int @default(0)
  mouvements Mouvement[]
  @@unique([annee, numero])
}

model Compte {
  id String @id @default(cuid())
  discordId String @unique
  pseudo String
  nomAffiche String
  avatarUrl String?
  role Role @default(GESTIONNAIRE)
  actif Boolean @default(true)
  ajouteLe DateTime @default(now())
  ajouteParId String?
  derniereConnexion DateTime?
  mouvements Mouvement[]
}

model Compteur {                 // séquences annuelles (contrats, déclarations)
  cle String @id                 // "CTR-2026"
  valeur Int @default(0)
}

model Parametres {               // une seule ligne, id = 1
  id Int @id @default(1)
  nomEntreprise String @default("Black Pégasus – American Transports")
  telephoneAgence String
  horaires String
  fuseauServeur String @default("Europe/Paris")
  numeroImmatriculationEntreprise String
  toleranceRetardMin Int @default(15)
  majorationRetard Float @default(0.5)
  seuilDefautRestitutionMin Int @default(180)
  penalitesSurCaution Boolean @default(false)   // § 9.4
  forfaitsDegats Json            // [{ libelle, montant }]
  textesSite Json                // accroche, présentation de la maison, étapes « Comment louer »
  reglement Json                 // [{ titre, contenu (markdown) }] + dateMiseAJour
}

model JournalAudit {
  id String @id @default(cuid())
  date DateTime @default(now())
  compteId String
  action String                  // "contrat.creer", "semaine.cloturer", "compte.desactiver"…
  cible String                   // "Contrat:CTR-2026-0042"
  details Json?
}
```

Les tables `Account`, `Session` et `VerificationToken` d'Auth.js s'ajoutent au schéma ; `Compte` reste la table métier.

---

## 5. Domaine (fonctions pures)

Chaque fonction a ses tests Vitest, avec **au minimum** les exemples chiffrés du HANDOFF § 7 et les cas ci-dessous.

| Module | Fonctions | Cas de test obligatoires |
|---|---|---|
| `argent.ts` | `formaterDollars(n)` → `$28 000` (espace fine insécable U+202F ou U+00A0, au choix unique) | 0, 300, 28 000, 514 630, négatifs `−$12 600` |
| `dates.ts` | `versHeureServeur`, `depuisHeureServeur`, `dureeMinutes(a, b)` | Location 22:00 → 10:00 la nuit du passage à l'heure d'hiver (25/10/2026) = **12 h** |
| `tarif.ts` | `calculerTarif({ debut, fin, prixHeure, prixJour })` → `{ heures, horaire, journalier, montant, tarifApplique, economie }` | Toro2 12 h → $3 600, journalier, économie $3 600 ; 1 min → 1 h ; 24 h Luxor → $28 000 ; 25 h ; 30 h ; fin ≤ début → erreur |
| `retard.ts` | `calculerRetard({ finPrevue, retourReel, prixHeure, tolerance, majoration })` → `{ minutes, heuresFacturees, penalite, defautRestitution }` | 5 min → 0 ; 15 min → 0 ; 16 min → 1 h ; 40 min Seashark2 → $225 ; 70 min Toro2 → $900 ; retour anticipé → 0 ; > 180 min → `defautRestitution` |
| `degats.ts` | `totalDegats(forfaitsCoches)` | aucun, un, plusieurs |
| `semaine.ts` | `semaineDe(date, fuseau)` → `{ id, annee, numero, debut, fin }`, `semaineSuivante` | dimanche 23:59 → S43 ; lundi 00:00 → S44 ; semaine 53 ; changement d'année ISO |
| `comptabilite.ts` | `synthese(mouvements, soldeOuverture)` → recettes, dépenses, résultat imposable, cautions détenues, apports, solde ; `controlesAvantCloture(...)` | Données S43 : recettes $91 400, dépenses $24 150, résultat $67 250, cautions $35 000, solde $514 630 ; contre-passations neutres |
| `numerotation.ts` | `numeroContrat(annee, n)`, `numeroOperation(semaine, n)`, `numeroJustificatif`, `numeroDeclaration` | `CTR-2026-0042`, `OP-43-007`, `JUST-43-03`, `DEC-2026-S43` |
| `disponibilite.ts` | `disponibilite(exemplaires)` → `{ libres, total, libelle }` | « 2 / 4 disponibles », « Complet » |
| `permissions.ts` | `peut(role, action)` | tableau HANDOFF § 7.9 complet |

`data/demo-semaine-43.json` sert de jeu de test d'intégration : la synthèse calculée doit retrouver exactement les chiffres des maquettes.

---

## 6. Services et transactions

Toutes les écritures passent par une Server Action → `garde.ts` (session + rôle) → validation Zod → service en **transaction Prisma `Serializable`** → écriture dans `JournalAudit` → `revalidatePath` du site public si la flotte change.

### 6.1 Créer un contrat
1. Vérifier que l'exemplaire est `DISPONIBLE` (verrou de ligne `SELECT … FOR UPDATE`) ; sinon erreur « Exemplaire déjà loué ».
2. Recalculer le tarif côté serveur avec `calculerTarif` (ne jamais faire confiance au montant envoyé).
3. Incrémenter `Compteur CTR-{année}` → numéro.
4. Créer le contrat (avec instantanés des prix) ; exemplaire → `LOUE`.
5. Créer deux mouvements automatiques : `CAUTION_ENCAISSEE` puis `LOCATION` (ordre des maquettes).
6. Hors transaction : générer le PDF du contrat, enregistrer sa clé.

### 6.2 Clôturer un contrat
1. Calculer retard et dégâts (domaine), saisir l'heure de retour réelle (par défaut : maintenant).
2. Mouvements automatiques : `PENALITE` (retard) et `PENALITE` (dégâts) si > 0, encaissées à part, puis `CAUTION_RENDUE` pour la caution intégrale.
   - Si `penalitesSurCaution` est actif : caution rendue = caution − pénalités (minimum 0), le reliquat éventuel reste une pénalité à encaisser.
3. Contrat → `TERMINE` ; exemplaire → `DISPONIBLE` (ou `MAINTENANCE` si l'utilisateur coche « Envoyer en maintenance »).

### 6.3 Imputation d'un mouvement à une semaine
- `date` = date réelle de l'opération ; `semaineId` = semaine de cette date **si elle est ouverte**.
- Si cette semaine est déjà clôturée (ex. retour d'un client le dimanche 23:59 après la clôture), le mouvement est **imputé à la première semaine ouverte suivante** et le registre l'indique (« Reporté de S43 »). Validé par le client.
- La semaine courante est créée à la volée au premier besoin (solde d'ouverture = solde de clôture de la précédente, ou solde courant si elle n'est pas encore clôturée).

### 6.4 Numérotation
- Les compteurs d'opérations et de justificatifs sont portés par `Semaine` et incrémentés dans la transaction : aucune rupture de séquence possible.
- Le numéro affiché reste `OP-43-012` comme dans les maquettes ; l'unicité en base est garantie par le couple (semaine, numéro).

### 6.5 Corriger une erreur
La comptabilité fournie au FISC doit être probante : **aucune suppression, aucune modification de montant**.
- Mouvement manuel d'une semaine ouverte : motif et justificatif modifiables ; montant, sens et catégorie non modifiables.
- Pour annuler : **contre-passation** (mouvement inverse, même catégorie, motif « Annulation de OP-43-012 », lien `annuleMouvementId`), réservée aux administrateurs. Le registre affiche les deux lignes barrées.
- Contrat créé par erreur : statut `ANNULE` + contre-passation de ses mouvements + exemplaire libéré (administrateur, semaine ouverte uniquement).

### 6.6 Clôturer une semaine
1. Administrateur uniquement ; la semaine précédente doit être clôturée ; possible à partir du dimanche 00:00 (heure serveur) **[À VALIDER]**.
2. Contrôles bloquants : dépenses sans justificatif. Contrôles informatifs : contrats en cours (leurs cautions restent détenues), retards.
3. Confirmation textuelle `CLÔTURER S43`.
4. Transaction : calcul de `soldeCloture`, statut `CLOTUREE`, création de la semaine suivante avec `soldeOuverture = soldeCloture`.
5. Génération du PDF de déclaration `DEC-2026-S43`, calcul de son empreinte SHA-256, stockage. Le PDF d'une semaine clôturée est servi tel quel, jamais régénéré.
6. Un gestionnaire peut exporter un **brouillon** (filigrane « BROUILLON ») d'une semaine ouverte.

---

## 7. Sécurité et permissions

- Middleware : toute route `/admin/**` (sauf `/admin/connexion`) exige une session. Chaque Server Action rappelle `exigerRole(...)` : le middleware ne suffit pas.
- Connexion Discord : refus si `discordId` absent de `Compte` ou compte inactif (page « Accès non autorisé »). Pseudo, avatar et `derniereConnexion` mis à jour à chaque connexion.
- Premier administrateur : créé par le seed à partir de la variable `ADMIN_DISCORD_ID`.
- Un administrateur ne peut ni se désactiver, ni se rétrograder, ni supprimer le dernier administrateur actif.
- Fichiers : PNG, JPG ou WEBP uniquement (vérification du type réel, pas de l'extension), 10 Mo maximum, renommés par identifiant aléatoire. Les justificatifs ne sont servis qu'aux sessions valides ; les photos de véhicules sont publiques.
- Route `interne/pdf/*` : accessible uniquement avec un jeton interne (`PDF_TOKEN`) transmis par le service PDF.
- Limitation de débit sur la connexion et les envois de fichiers. En-têtes de sécurité (CSP, `X-Frame-Options`).

---

## 8. Rendu, design et PDF

- `tokens.css` est importé tel quel ; `@theme` de Tailwind mappe les couleurs, rayons et polices. Aucune couleur en dur dans les composants.
- Polices locales via `next/font/local` (fichiers de `assets/fonts/`).
- Chaque écran est reproduit d'après sa capture et le CSS de la page HTML correspondante. Le fichier `05-systeme-de-composants.html` sert de page de référence : il est recréé en route de développement `/admin/dev/composants` (masquée en production) pour valider les composants.
- `backdrop-filter` : prévoir un repli opaque (`@supports not (backdrop-filter: blur(1px))`).
- PDF : les gabarits 30–32 sont convertis en pages React dans `interne/pdf/`, imprimées en A4 par Playwright (`page.pdf({ format: 'A4', printBackground: true })`). Le PDF doit ressembler à `maquettes/pdf/*.pdf`.
- Site public : responsive (aucune maquette mobile : empiler les colonnes, filtres de la flotte dans un tiroir, en-tête repliable). Panel : desktop, largeur minimale 1280 px.

---

## 9. Compléments et corrections par rapport aux maquettes

### 9.1 Écran « Paramètres du site » (nouveau, sans maquette)
Le client veut pouvoir configurer le site ; le HANDOFF prévoit la table `Parametres` mais aucun écran. Route `/admin/parametres`, administrateur uniquement, composé avec les composants existants (gabarit du formulaire véhicule, page 15) :
- **Agence** : téléphone en jeu, horaires, n° d'immatriculation, fuseau du serveur.
- **Textes du site** : accroche de l'accueil, présentation « La maison », trois étapes « Comment louer ».
- **Règlement** : articles ordonnables (titre + contenu markdown), date de mise à jour ; la page publique est générée à partir de ces articles.
- **Règles de location** : tolérance de retard, majoration, seuil de défaut de restitution, pénalités retenues sur la caution (oui/non), forfaits de dégâts (ajout, modification, suppression).
- **Catégories** par type de véhicule (ajout, renommage, ordre ; suppression impossible si utilisée).

### 9.2 Journal d'activité
Ajouté à la conception (table `JournalAudit`), consultable en bas de la page Comptes par les administrateurs. Utile dès que plusieurs personnes saisissent de l'argent.

### 9.3 Notifications (cloche de l'en-tête)
Version simple, calculée à l'affichage : contrats en retard, semaine précédente non clôturée, dépenses sans justificatif.

### 9.4 Écarts relevés dans les maquettes
| Constat | Décision |
|---|---|
| L'opération `OP-43-027` « Primes hebdomadaires des employés » ($6 000) contredit l'absence d'employés et de salaires | Renommer dans le seed (ex. « Frais de représentation ») **[À VALIDER]** — le montant reste pour garder les totaux |
| L'accueil affiche le Luxor « 1 / 1 disponible » alors qu'il est loué dans les données | Les données font foi : le site affiche la disponibilité réelle |
| Accueil : « Hélicoptères » et le compteur de modèles se chevauchent sur la carte | Corriger la mise en page (retour à la ligne du compteur) |
| Nom « Streamer 2026 » | Renommé **« Streamer216 »** (slug `streamer216`) dans le seed (validé) |
| Pénalités payées à part ou retenues sur la caution | **Encaissées à part** (validé). Le paramètre `penalitesSurCaution` reste disponible, désactivé |

---

## 10. Variables d'environnement

```text
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_DISCORD_ID=...
AUTH_DISCORD_SECRET=...
AUTH_URL=https://black-pegasus.example
ADMIN_DISCORD_ID=...          # premier administrateur créé au seed
STOCKAGE_DIR=/data
PDF_TOKEN=...
```

En production, ces variables sont définies dans la stack Portainer (onglet *Environment variables*), jamais dans l'image ni dans le dépôt.

---

## 12. Déploiement et CI/CD

### Chaîne de mise en production

```text
git push (branche main)
   └─► GitHub Actions « ci »      lint · tests Vitest · build · tests e2e (Postgres en service)
          └─ si vert ─► « deploy »  docker build ─► push ghcr.io/<compte>/black-pegasus:{latest, sha}
                                     └─► POST $PORTAINER_WEBHOOK_URL
                                            └─► Portainer retélécharge l'image et redémarre la stack
                                                   └─► entrypoint : prisma migrate deploy, puis node server.js
```

### Workflows GitHub Actions
- **`ci.yml`** — sur chaque pull request et chaque push : `npm ci`, `prisma generate`, `lint`, `test`, `build`, puis `test:e2e` avec un service `postgres:16` et le seed de démonstration.
- **`deploy.yml`** — sur push sur `main` (après succès de `ci` via `workflow_run`, ou en `needs:` dans le même workflow) et en déclenchement manuel (`workflow_dispatch`) :
  1. `docker/setup-buildx-action`, `docker/login-action` sur `ghcr.io` avec `GITHUB_TOKEN` (permission `packages: write`) ;
  2. `docker/build-push-action` avec cache GitHub Actions (`cache-from/to: type=gha`), étiquettes `latest` et `sha-<court>` ;
  3. appel du webhook : `curl -fsS -X POST "$PORTAINER_WEBHOOK_URL"` ; l'étape échoue si Portainer ne répond pas 2xx.
- Un groupe `concurrency: production` empêche deux déploiements simultanés.

### Image Docker
- `Dockerfile` multi-étapes : `deps` (npm ci) → `build` (`next build` en `output: 'standalone'`, `prisma generate`) → `runtime`.
- Base d'exécution compatible Chromium pour Playwright : partir de `mcr.microsoft.com/playwright` (version alignée sur celle du `package.json`) **ou** d'une Debian slim avec `npx playwright install --with-deps chromium`. Ne pas utiliser Alpine.
- L'image contient le moteur Prisma, les migrations et le CLI `prisma` (nécessaire à `migrate deploy`), mais **pas** le seed de démonstration.
- Utilisateur non root, `HEALTHCHECK` sur `/api/sante` (vérifie la connexion à la base).
- `docker-entrypoint.sh` : `prisma migrate deploy` puis lancement du serveur ; si la migration échoue, le conteneur s'arrête (Portainer garde l'ancienne version visible en erreur plutôt qu'une application à moitié migrée).

### Stack Portainer (`deploy/stack.yml`)
- Services : `app` (image `ghcr.io/<compte>/black-pegasus:latest`, `pull_policy: always`), `db` (`postgres:16`, volume `pgdata`), volume `fichiers` monté sur `/data`.
- Pas de port Postgres exposé à l'extérieur ; l'app est publiée derrière le reverse proxy déjà en place sur le VPS (HTTPS).
- Webhook de stack activé dans Portainer, avec l'option de **retéléchargement de l'image** active ; l'URL du webhook est stockée dans le secret GitHub `PORTAINER_WEBHOOK_URL`.
- Si le paquet GHCR est privé : enregistrer `ghcr.io` comme registre dans Portainer (jeton GitHub avec `read:packages`).

### Données en production
- **Jamais de seed de démonstration en production.** Un script séparé `npm run db:init-prod` (lancé une seule fois à la main, depuis la console du conteneur dans Portainer) crée : la ligne `Parametres`, les catégories, le premier administrateur (`ADMIN_DISCORD_ID`), la semaine en cours avec un solde d'ouverture saisi. La flotte réelle est ensuite saisie dans le panel (ou importée depuis `flotte.json` sur demande).
- Sauvegarde quotidienne : conteneur `pg_dump` planifié dans la stack (ou tâche cron du VPS), plus archive du volume `fichiers` ; conservation 14 jours. La restauration est testée une fois avant l'ouverture.

### Secrets GitHub à créer
`PORTAINER_WEBHOOK_URL` (le reste passe par `GITHUB_TOKEN`). Aucune variable applicative n'est nécessaire au build : celles de Next.js lues à l'exécution ne doivent pas être préfixées `NEXT_PUBLIC_`.

---

## 11. Décisions

### Validées par le client (20/10/2026)
| # | Question | Décision |
|---|---|---|
| D1 | Hébergement et mise en production | VPS du client, stack Portainer redéployée par webhook à partir des images construites depuis le dépôt GitHub |
| D2 | Pénalités | Payées à part (mouvement `PENALITE`), caution rendue intégralement |
| D3 | Mouvement daté d'une semaine déjà clôturée | Reporté sur la semaine ouverte suivante |
| D7b | Nom de l'avion « Streamer 2026 » | Renommé « Streamer216 » |

### Encore ouvertes (valeur par défaut appliquée en attendant)
| # | Question | Valeur par défaut |
|---|---|---|
| D4 | Clôture possible avant la fin du dimanche ? | Oui, dès le dimanche 00:00 |
| D5 | Montants des forfaits de dégâts, tolérance, majoration | $500 / $250 / $1 000, 15 min, 50 % (modifiables dans Paramètres) |
| D6 | Téléphone, horaires, n° d'immatriculation, date du règlement | Contenus provisoires, modifiables dans Paramètres |
| D7a | Motif de `OP-43-027` (« Primes hebdomadaires des employés ») | Renommé « Frais de représentation » dans le seed |
