# Plan d'exécution — Filiales (F-2 à F-6)

> Document de relais : il permet à un autre agent (Codex, Claude…) de reprendre le développement sans l'historique de conversation. **Lire d'abord** `AGENTS.md` (règles et pièges), `docs/CONCEPTION-FILIALES.md` (le quoi et le pourquoi), puis la phase à traiter ci-dessous. En cas de doute fonctionnel : demander à l'utilisateur, ne pas inventer.

## 0. État au 07/11/2026

| Phase | État | Commit |
|---|---|---|
| Phases 0 à 13 (site, panel, contrats, solde, comptabilité, paramètres, déploiement) | Terminées | `dc3f349` et précédents |
| Conception filiales | Validée | `4a56975` |
| **F-1** Modèle des filiales, reprise des données, filiale des mouvements | **Terminée** | `feb2b5a` |
| **F-2** Site groupe et paramètres des filiales | **Terminée** | `247112c` |
| **F-3** Formation | **Terminée** | `efa5eec` |
| F-4 Cards | À faire | |
| F-5 Comptabilité ventilée | À faire | |
| F-6 Paramètres par filiale et finitions | À faire | |

### Ce que F-1 a mis en place (à réutiliser)

- **Prisma** (`prisma/schema.prisma`, migration `20261107120000_filiales`) :
  - `enum CodeFiliale { BPL BPF BPC }` ;
  - `model Filiale` (clé `code`) : `slug` (`location`, `formation`, `cards`), `nom`, `accroche`, `logo` (chemin public `/images/logos/…`), `telephone`, `horaires`, `ordre`, `visible`. BPF et BPC sont `visible = false` ;
  - `Mouvement.filiale CodeFiliale?` (`null` = « Groupe », frais communs) ;
  - catégories de mouvement `FORMATION` (recette, BPF), `VENTE_CARTES` (recette, BPC), `ACHAT_STOCK` (dépense, BPC, justificatif exigé) ;
  - `Contrat.numeroLicence String?` ; contrats numérotés `BPL-AAAA-NNNN` (compteur `BPL-2026`, dans la continuité de `CTR-2026`) ;
  - `Parametres` = le groupe (`nomEntreprise` = « Black Pégasus Compagnie », immatriculation, fuseau) **et**, provisoirement, les textes / règlement / règles / forfaits / photos de l'accueil de **Location** (seule filiale qui loue). Le téléphone et les horaires ne sont plus dans `Parametres` : ils sont sur `Filiale`.
- **Domaine** `src/domaine/filiales.ts` : `CODES_FILIALE`, `LIBELLES_FILIALE` (Location, Formation, Cards), `libelleFiliale(code | null)` (« Groupe » pour null), `filialeImposee(categorie)`, `filialeParDefaut(categorie)`, `verifierFilialeMouvement(categorie, filiale)`.
- **Services** : `inscrireMouvement` (`src/services/mouvements.ts`) accepte `filiale` et la vérifie ; les mouvements de contrat sont en `BPL` ; la contre-passation recopie la filiale. `lireParametresSite()` (`src/services/site.ts`) renvoie le contact de **BPL** dans `telephone` / `horaires`.
- **Panel** : sélecteur « Filiale » dans la modale « Nouveau mouvement » (verrouillé quand la catégorie l'impose) ; filiale affichée dans la fiche d'un mouvement ; champ « N° de licence (facultatif) » à la création d'un contrat (repris sur le PDF).
- **Contenus initiaux** : `prisma/contenus.ts` → `filialesInitiales` (utilisé par `prisma/seed.ts` et `prisma/init-prod.ts`).
- **Logos** : `public/images/logos/bp-compagnie.webp`, `bp-location.png` (fond transparent), `bp-formation.webp`, `bp-cards.webp` (fonds noirs carrés → à afficher en médaillon rond `rounded-full overflow-hidden`).

### Ce que F-2 a mis en place (à réutiliser)

- **État à la livraison de F-2** : BPF et BPC restent masquées dans le seed et à la première initialisation de production. F-3 active ensuite BPF dans le seed.
- **Site** : accueil groupe sur `/`, Location sur `/location` et ses sous-routes ; anciennes adresses redirigées en 308 avec leur requête. L’en-tête du groupe et le pied de page affichent les filiales visibles. Dans une filiale, l’en-tête porte son identité et sa navigation, avec « Retour au groupe » à droite d’« Espace admin » (ajustement utilisateur après F-2) ; aucune seconde barre. Le layout Location vérifie la visibilité pour toute la section.
- **Formation et Cards** : leurs routes existent avec une présentation d’identité et de contact (`PresentationFiliale`), accessible seulement si la filiale est visible. Remplacer ces présentations par les pages métier en F-3 / F-4 ; conserver le contrôle de visibilité et `data-filiale`.
- **Lectures** : `lireFiliale(code)` et `lireFilialesVisibles()` dans `src/services/site.ts` (React `cache`, `await connection()`). `lireParametresSite()` expose aussi `textesGroupe` ; son contexte de variables historiques (`telephone`, `horaires`, règles) reste celui de Location.
- **Couleurs** : les jetons `--bp-accent*` se déclinent sous `data-filiale="location"`, `"formation"` ou `"cards"`. Utilitaires et composants suivent cet accent ; groupe, panel et PDF restent en or.
- **Paramètres** : identité du groupe, textes de l’accueil groupe et formulaire pour chaque filiale (identité, contact, ordre, visibilité, logo envoyé). Le champ `Filiale.logo` contient une URL publique : `/images/logos/…` ou `/api/fichiers/photos/…`.
- **Données** : migration `20261107140000_site_groupe`, `Parametres.textesGroupe` ; textes initiaux dans `prisma/contenus.ts`, seed et `init-prod`. Aucune nouvelle dépendance ni variable d’environnement.
- **Validation** : lint et build réussis, 273 tests unitaires et 78 tests e2e réussis ; 19 tests du site repassés après l’ajustement final de l’en-tête mobile. Captures, limites du statut 404 en streaming et textes à relire : [bilan F-2](validations/f2/README.md).

### Ce que F-3 a mis en place (à réutiliser)

- **Prochaine phase : F-4 (Cards)**, après validation du rendu Formation. Le header conserve le style or et verre demandé, même dans une filiale.
- **Catalogue validé** : Licence navigation et Licence pilotage, 4 000 $ chacune ; visite médicale, questionnaire et test pratique. Domaines Navigation et Aérien ; durée laissée vide. Constante `formationInitiale` dans `prisma/contenus.ts`, commune au seed et à la première initialisation de production.
- **Prisma** : migration `20261107160000_formation` ; `DomainePermis`, `Permis` (suppression logique), `DemandeContact`, `StatutDemande`. `Compte.demandesTraitees` conserve l’auteur du traitement.
- **Audit public** : `JournalAudit.compteId` est nullable ; une réception publique est attribuée à « Site public », sans coordonnées ni message dans le journal. Les autres actions gardent leur auteur connecté. Le journal du panel gère cette valeur nulle.
- **Services et domaine** : `src/services/formation.ts` orchestre les transactions et revalidations. `src/domaine/formation.ts` contient la validation des coordonnées en jeu, le regroupement/tri des permis et le compte des demandes nouvelles.
- **Écrans** : `/formation` (catalogue + contact), `/admin/formation/permis` (domaines et permis), `/admin/formation/demandes` (Nouvelles/Toutes, traitement, pagination). Les écritures du panel passent par `exigerRole`, Zod, transaction et audit ; l’action de contact est publique conformément au périmètre F-3.
- **Permissions et cloche** : `formation.gerer` et `demande.consulter` pour ADMIN/GESTIONNAIRE uniquement. Le FISC ne reçoit pas les notifications Formation. L’en-tête du panel est au-dessus des cartes pour rendre les liens de la cloche cliquables.
- **Limites** : cinq tentatives par IP sur dix minutes, piège anti-robot ; aucun stockage d’IP. Les visibilités de BPF et du permis sont revérifiées lors de l’envoi. Le limiteur reste en mémoire, comme les limiteurs existants.
- **Seed et production** : BPF visible et deux demandes de démonstration dans le seed ; aucun changement aux totaux comptables. En production, catalogue créé seulement si ses tables sont vides, aucune demande de démonstration, visibilité de la filiale conservée. Les permis supprimés ne sont pas recréés au redémarrage.
- **Validation** : lint/build au vert, 297 tests unitaires, 86 tests e2e ; couverture du domaine : lignes/fonctions 100 %, branches 98,37 %. Captures, précisions de déploiement et durées encore vides : [bilan F-3](validations/f3/README.md).

## 1. Méthode, pour chaque phase

1. Relire la section de la phase et `docs/CONCEPTION-FILIALES.md`.
2. Domaine d'abord (`src/domaine/*.ts`, fonctions pures, testées par Vitest, couverture ≥ 95 %).
3. Schéma + migration (procédure dans `AGENTS.md`), puis `npx prisma generate`, puis **redémarrer** le serveur de dev.
4. Services (transactions, journal), actions serveur, écrans.
5. Seed de démonstration mis à jour (`npm run db:seed` doit passer et rester cohérent).
6. Tests e2e de la phase (`tests/e2e/*.spec.ts`), qui nettoient ce qu'ils créent.
7. Écrans sans maquette : composer avec les composants existants (`src/composants/ui`, `src/composants/site`), faire une **capture Playwright**, la montrer à l'utilisateur avant d'affiner.
8. Fin de phase : `npm run lint`, `npm test`, `npm run test:e2e` (sur une base fraîche : `npm run db:seed` avant), `npm run build` au vert, puis commit `phase F-n : <résumé>` avec la ligne `Co-Authored-By` de l'agent, puis mettre à jour le tableau du § 0.

---

## F-2 — Site groupe et paramètres des filiales

**But** : l'accueil devient celui de Black Pégasus Compagnie ; le site actuel passe sous `/location` ; chaque filiale a sa couleur ; les administrateurs gèrent identité, contact et visibilité des filiales.

### Données
- `Parametres.textesGroupe Json @default("{}")` : `{ accroche: { titre, texte }, presentation: { titre, texte } }` (même mise en forme que `textesSite` : `*accent*` dans les titres, variables `{{…}}`). Valeurs de départ dans `prisma/contenus.ts` (`textesGroupe`), reprises par le seed, `init-prod` et la migration (UPDATE avec un JSON par défaut).

### Couleurs (jetons, jamais en dur)
Dans `src/styles/tokens-complementaires.css` :
```css
--bp-filiale-location: #6cb4e4;  /* bleu horizon, 8,7:1 sur noir */
--bp-filiale-formation: #5cc08f; /* vert brevet, 8,8:1 */
--bp-filiale-cards: #b48cf0;     /* violet holo, 7,5:1 */
```
Mécanisme proposé : une variable d'accent `--bp-accent` (+ `--bp-accent-texte`, `--bp-accent-degrade`, et des teintes `color-mix` à 8/10/30/45 %) valant l'or par défaut sur `:root`, redéfinie par `[data-filiale="location"|"formation"|"cards"]`. Les utilitaires et composants qui portent l'or **dans les sections de filiale** (prix, titres en accent, bouton principal `bp-btn--or`, `texte-or`, `fond-or`, `text-or-texte`, `text-or-icone`, filets) lisent `--bp-accent`. Le groupe (accueil, en-tête, pied de page, panel, PDF) reste en or. Vérifier le contraste du texte sur bouton d'accent (texte `--bp-black`).

### Routes publiques (`src/app/(public)/`)
- Déplacer l'accueil actuel `page.tsx` → `location/page.tsx`, `flotte/` → `location/flotte/`, `reglement/` → `location/reglement/`. Ajouter `location/layout.tsx` qui pose `data-filiale="location"` sur un conteneur.
- Nouvel accueil `page.tsx` (groupe) : hero avec le logo Compagnie et `textesGroupe.accroche` ; cartes des **filiales visibles** (logo en médaillon, nom, accroche, filet de la couleur de la filiale, lien vers `/{slug}`) ; présentation du groupe ; contacts (téléphone et horaires de chaque filiale visible).
- Redirections permanentes dans `next.config.ts` (`redirects()`) : `/flotte` → `/location/flotte`, `/flotte/:slug` → `/location/flotte/:slug`, `/reglement` → `/location/reglement` (garder la chaîne de requête).
- Mettre à jour **tous** les liens internes (`grep -rn '"/flotte\|"/reglement\|/flotte?' src`), y compris `FiltresFlotte`, `NavSite`, `PiedDePage`, `CarteVehicule`, `Texte.tsx` (liens du règlement), les cartes de l'accueil Location (`/flotte?type=…`).
- En-tête du groupe : logo Compagnie et navigation des filiales visibles. Dans une section : logo, nom et navigation propres à la filiale, avec « Retour au groupe » à droite d’« Espace admin » ; le lien actif correspond à la page courante. Pied de page : groupe (© Black Pégasus Compagnie), liens vers les filiales visibles.
- Une filiale masquée (`visible = false`) renvoie 404 sur sa section.
- Services : dans `src/services/site.ts`, ajouter `lireFilialesVisibles()` et `lireFiliale(code)` (React `cache`, `await connection()` comme `lireParametresSite`). Remplacer l'usage de `lireParametresSite().telephone` par le contact de la filiale concernée.
- PDF de contrat (`src/app/interne/pdf/contrat/[id]/page.tsx`) : remplacer le texte en dur « AMERICAN TRANSPORTS » par le nom de la filiale BPL et le logo `bp-location.png` ; garder la palette d'impression or.

### Panel — Paramètres › Filiales
- Section « Filiales » (administrateur) : pour chaque filiale, nom, accroche, téléphone, horaires, logo (envoi d'image comme la photo d'un véhicule : `lireImageEnvoyee`, `enregistrerFichier("photos", …)`, `exigerQuotaEnvoi`), ordre, interrupteur **Visible sur le site**. Le bloc actuel « Agence » ne garde que l'identification du groupe (immatriculation, fuseau) et le nom du groupe ; le contact de Location va dans sa fiche filiale.
- Section « Accueil du groupe » : `textesGroupe`.
- Service `src/services/parametres.ts` : `enregistrerFiliale(acteur, code, données, logo?)`, `enregistrerTextesGroupe` ; journal (`parametres.filiale`, `parametres.textesGroupe`, libellés dans `src/services/audit.ts`) ; `revalidatePath("/", "layout")`.

### Tests
- e2e : accueil groupe (cartes des filiales visibles seulement), redirections (statut 308 et cible), `/location/...` identique à l'ancien site, filiale masquée → 404, modification du téléphone d'une filiale visible aussitôt, axe sans violation, aucun débordement horizontal (390/768/1024/1440 px). Adapter `site.spec.ts`, `accueil.spec.ts`, `finitions.spec.ts` (liste des pages), `nom-rp-fisc-photos.spec.ts` (carte Bateaux désormais sous `/location`).

### Critères
Aucun lien cassé ; anciennes URL redirigées ; contraste ≥ 4,5:1 ; capture montrée avant d'affiner.

---

## F-3 — Black Pégasus Formation

**But** : vitrine des permis (la délivrance est gérée par l'État) et formulaire de contact dont les demandes arrivent dans le panel.

### Données
```prisma
model DomainePermis { id String @id @default(cuid()) nom String @unique ordre Int @default(0) permis Permis[] }
model Permis {
  id String @id @default(cuid())
  domaineId String
  domaine DomainePermis @relation(fields: [domaineId], references: [id])
  nom String
  description String        // texte riche (src/lib/texteRiche.ts)
  prerequis String @default("")
  duree String @default("")     // ex. « 3 séances de 2 h »
  epreuves String @default("")
  prix Int                      // dollars entiers
  ordre Int @default(0)
  visible Boolean @default(true)
  supprimeLe DateTime?
  demandes DemandeContact[]
}
enum StatutDemande { NOUVELLE TRAITEE }
model DemandeContact {
  id String @id @default(cuid())
  nomRp String
  telephone String
  permisId String?
  permis Permis? @relation(fields: [permisId], references: [id])
  message String
  statut StatutDemande @default(NOUVELLE)
  creeLe DateTime @default(now())
  traiteeLe DateTime?
  traiteeParId String?   // relation vers Compte
}
```
Domaines **libres** (créés dans le panel), un domaine utilisé ne se supprime pas.

### Domaine (`src/domaine/formation.ts`, testé)
Validation d'une demande (nom RP 2–60, téléphone en jeu `^[0-9][0-9 .-]{2,14}$`, message 10–1000) ; regroupement et tri des permis par domaine ; compte des demandes nouvelles (pour la cloche).

### Site `/formation` (`src/app/(public)/formation/`, `data-filiale="formation"`)
Hero (logo Formation, accroche, contact BPF) ; permis groupés par domaine (nom, prix via `formaterDollars`, modalités) ; formulaire (composant client) → action serveur **publique** : Zod, **limitation de débit par IP** (`creerLimiteur` de `src/lib/limiteur.ts`, ex. 5 envois / 10 min, nouvelle entrée dans `src/lib/limites.ts`), champ piège anti-robot caché ; message de confirmation. Pas de collecte d'autre donnée personnelle.

### Panel (groupe « Formation » dans la barre latérale)
- `/admin/formation/permis` : domaines (ajout, renommage, ordre, suppression si inutilisé) et permis (ajout, modification, visibilité, suppression logique).
- `/admin/formation/demandes` : tableau (date, nom RP, téléphone, permis, message, statut) ; « Marquer traitée » ; filtre Nouvelles / Toutes.
- Cloche : nouvelle alerte « N demande(s) de formation » (`src/domaine/notifications.ts`, `src/services/panel.ts`).
- Permissions (`src/domaine/permissions.ts` + tests) : `formation.gerer` (ADMIN, GESTIONNAIRE), `demande.consulter` (ADMIN, GESTIONNAIRE) — **pas** le FISC.
- Encaissement : saisi au solde, catégorie *Formation* (déjà prête depuis F-1).

### Seed
Catalogue fourni et validé par l’utilisateur pendant F-3 : deux domaines (Navigation, Aérien) et deux licences, **Licence navigation** et **Licence pilotage**, à **4 000 $ chacune**. Prérequis : visite médicale ; épreuves : questionnaire et test pratique ; durée non renseignée. Deux demandes de démonstration. Filiale BPF `visible = true` en démo. En production, création du catalogue validé uniquement si les tables sont vides, sans demandes de démonstration et sans changer la visibilité de la filiale.

### Tests
Unitaires (validation) ; e2e : page publique, envoi du formulaire → demande visible dans le panel et dans la cloche, limitation de débit (statut d'erreur après N envois), gestion des permis, FISC sans accès aux demandes, axe.

---

## F-4 — Black Pégasus Cards

**But** : catalogue public de cartes TCG ; ventes saisies dans le panel qui décrémentent le stock et inscrivent la recette.

### Données
```prisma
model CategorieCarte { id String @id @default(cuid()) nom String @unique ordre Int @default(0) cartes Carte[] }
model Carte {
  id String @id @default(cuid())
  categorieId String
  categorie CategorieCarte @relation(fields: [categorieId], references: [id])
  nom String
  prix Int
  stock Int @default(0)          // exemplaires restants, ≥ 0
  photo String?                  // clé de stockage ; visuel par défaut sinon
  ordre Int @default(0)
  visible Boolean @default(true)
  supprimeLe DateTime?
  ventes VenteCarte[]
}
enum StatutVente { VALIDEE ANNULEE }
model VenteCarte {
  id String @id @default(cuid())
  numero String @unique          // BPC-2026-0001 (compteur « BPC-2026 »)
  carteId String
  carte Carte @relation(fields: [carteId], references: [id])
  carteNom String                // instantanés figés
  prixUnitaire Int
  quantite Int
  montant Int
  clientNom String
  clientTelephone String?
  date DateTime
  statut StatutVente @default(VALIDEE)
  saisieParId String             // relation vers Compte
  mouvements Mouvement[]
}
// Mouvement : + venteCarteId String? (relation), comme contratId
```

### Domaine (`src/domaine/cards.ts`, testé)
`montantVente(prix, quantite)` (entiers, quantité ≥ 1), `verifierStock(stock, quantite)` (refus si insuffisant), `etatCarte(stock)` (« Épuisée » à 0, sinon « N exemplaire(s) »), numérotation `numeroVente(annee, n)` dans `src/domaine/numerotation.ts` (`BPC-2026-0001`).

### Services (`src/services/cards.ts`)
- `creerVente` : transaction, verrou `SELECT … FOR UPDATE` sur la carte (comme `creerContrat`), contrôle du stock, décrément, numéro via `Compteur`, `inscrireMouvement` (`VENTE_CARTES`, `ENTREE`, `filiale: "BPC"`, `automatique: true`, `venteCarteId`), journal.
- `annulerVente` (administrateur) : refus si un mouvement est en semaine clôturée ; contre-passation (`preparerContrePassation`) ; stock rendu ; statut `ANNULEE` ; journal.
- CRUD catégories / cartes ; une modification manuelle du stock est journalisée (ancienne → nouvelle valeur). Les achats de stock se saisissent au solde (*Achat de stock*, justificatif exigé).

### Site `/cards` (`data-filiale="cards"`)
Hero (logo Cards, accroche, contact BPC) ; filtre par catégorie dans l'URL (`?categorie=`) ; recherche ; grille : photo (ou visuel par défaut), nom, prix (accent), « N exemplaires » ; carte **grisée** et badge « Épuisée » à 0 (n'atténuer que la photo pour garder le contraste du texte, cf. `.bp-vcard`) ; bouton « Appeler pour acheter » (`BoutonAppeler` avec le téléphone de BPC).

### Panel (groupe « Cards »)
- `/admin/cards` : catégories et cartes (photo, prix, stock, visibilité).
- `/admin/cards/ventes` : liste (n°, date, carte, quantité, montant, client, saisi par, statut), modale « Nouvelle vente » (carte, quantité, client ; montant **calculé côté serveur**), annulation (administrateur, avec confirmation).
- Permissions : `cards.gerer`, `vente.creer` (ADMIN, GESTIONNAIRE), `vente.annuler` (ADMIN), `vente.consulter` (ADMIN, GESTIONNAIRE, **FISC**).
- Registre : la pièce d'un mouvement de vente est le n° `BPC-…` (`pieceAbregee` le gère déjà).

### Seed
Trois catégories, une quinzaine de cartes dont certaines à 0 exemplaire, trois ventes en S43 (mettre à jour les totaux vérifiés par `verifierSeed` en conséquence, ou dater ces ventes hors S43). Filiale BPC `visible = true` en démo.

### Tests
Unitaires (montant, stock) ; e2e : vente → stock et registre, vente au-delà du stock refusée, **deux ventes simultanées sur le dernier exemplaire : une seule passe**, annulation (stock rendu, contre-passation), carte grisée sur le site, FISC en consultation, axe.

---

## F-5 — Comptabilité ventilée par filiale

**But** : un registre unique, lisible par filiale.

- Domaine (`src/domaine/comptabilite.ts`) : `syntheseParFiliale(mouvements)` → pour BPL, BPF, BPC et Groupe : recettes, dépenses, résultat ; test : **la somme des lignes égale la synthèse du groupe**.
- Comptabilité (`/admin/comptabilite`) : colonne « Filiale » (étiquette couleur de la filiale) dans le registre ; filtre `?filiale=BPL|BPF|BPC|groupe` combiné aux onglets ; tableau « Par filiale » sous la synthèse.
- Solde (`/admin/solde`) : filtre par filiale dans l'historique ; filiale visible dans le tableau.
- Tableau de bord : recettes de la semaine par filiale (petit tableau ou barres empilées ; rester sobre).
- Déclaration PDF (`src/app/interne/pdf/declaration/[id]/page.tsx`) : section « Ventilation par filiale » ; vérifier la pagination. Les déclarations **déjà archivées ne sont jamais régénérées**.
- CSV : colonne « Filiale ».
- Tests : unitaires (somme), e2e (filtres, PDF brouillon contient la ventilation).

---

## F-6 — Paramètres par filiale et finitions

- Paramètres réorganisés : **Groupe** (nom, immatriculation, fuseau, accueil du groupe) puis une page ou un onglet par filiale : *Location* (contact, textes de l'accueil Location, règlement, règles de location, forfaits, catégories de véhicules, photos de l'accueil), *Formation* (contact, textes, domaines), *Cards* (contact, textes, catégories).
- Option : déplacer les textes / règlement / règles de Location de `Parametres` vers une table dédiée (ou des champs JSON sur `Filiale`) ; sinon documenter qu'ils restent dans `Parametres` car seule Location loue.
- Finitions : responsive, axe sur toutes les nouvelles pages, états vides, e2e complets, `docs/DEPLOIEMENT.md` si de nouvelles variables apparaissent, rapport final « ce qui reste à valider ».

---

## Questions encore ouvertes (à poser à l'utilisateur au moment voulu)
- Textes définitifs de l'accueil du groupe et des accroches des filiales (des textes de départ modifiables suffisent pour développer).
- Catégories et cartes réelles (permis et tarifs de Formation validés pendant F-3).
- Logos détourés (PNG transparent) pour Compagnie, Formation et Cards.
