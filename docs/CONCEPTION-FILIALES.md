# Conception — Filiales (brouillon à valider)

> Statut : **validé le 07/11/2026**. Complète `docs/CONCEPTION.md` (qui reste la référence pour tout ce qui n'est pas dit ici). Développement par phases F-1 à F-6 : plan détaillé et état d'avancement dans **`docs/PLAN-FILIALES.md`** (F-1 à F-3 terminées).

## 1. Le groupe et ses filiales

**Black Pegasus Compagnie** est le groupe : l'entité déclarée au FISC, avec un seul solde, un seul registre, une seule clôture hebdomadaire et une seule déclaration. Charte **or et noir** (charte actuelle).

| Filiale | Préfixe | Activité | Sur le site |
|---|---|---|---|
| **Black Pegasus Location** | BPL | Location d'avions, d'hélicoptères et de bateaux (le site actuel) | Flotte, fiches, tarifs, règlement, « appelez-nous » |
| **Black Pegasus Formation** | BPF | Centre de formation au pilotage et à la navigation, agréé par l'État ; délivre les licences de navigation et d'aéronef | Permis proposés : modalités et prix, puis formulaire de contact |
| **Black Pegasus Cards** | BPC | Vente de cartes TCG | Catalogue par catégorie : nom, prix, exemplaires restants ; carte grisée à 0 ; achat en appelant |

Décisions prises :
- **[F1/F2]** Le groupe et les trois filiales ci-dessus. Seule BPL loue des véhicules.
- **[F3]** Les véhicules restent propres à BPL (types Bateaux / Avions / Hélicoptères inchangés). BPF gère des **permis**, BPC des **cartes**.
- **[F4]** Un préfixe par filiale : **BPL**, **BPF**, **BPC**.
- **[F5]** Un site groupe, une section par filiale.
- **[F6]** Une **couleur propre à chaque filiale** ; l'or et le noir restent la charte du groupe.
- **[F7]** Pas d'équipes par filiale : tous les comptes gèrent l'ensemble du groupe (rôles actuels inchangés : administrateur, gestionnaire, FISC).
- **[F8]** Une seule comptabilité, adaptée aux filiales (§ 7).

## 2. Ce qui change dans les données

```text
Parametres (groupe, 1 ligne)   nom du groupe, immatriculation FISC, fuseau, clôture,
                               textes de l'accueil groupe
Filiale                        code (BPL / BPF / BPC), slug, nom, accroche, logo, couleur,
                               téléphone, horaires, textes, ordre, visible
  BPL ─ TypeVehicule ─ Categorie ─ Vehicule ─ Exemplaire ─ Contrat      (existant)
        + règlement, règles de location, forfaits de dégâts (déplacés de Parametres)
  BPF ─ Permis                    nom, domaine (navigation / aérien), description,
                                  modalités (prérequis, durée, épreuves), prix, ordre, visible
        DemandeContact            nom RP, téléphone, permis visé, message, statut, date
  BPC ─ CategorieCarte ─ Carte    nom, photo (facultative), prix, exemplaires restants, ordre, visible
        VenteCarte                n° BPC-2026-0001, carte, quantité, prix unitaire figé, client, date
Mouvement                       + filiale (BPL / BPF / BPC, ou « Groupe » pour les frais communs)
```

Reprise de l'existant : la filiale BPL est créée à partir de `Parametres` (téléphone, horaires, textes, règlement, règles, forfaits, photos de l'accueil) ; véhicules, contrats et mouvements existants lui sont rattachés. Les semaines déjà clôturées et leurs PDF archivés ne sont pas régénérés.

## 3. Site public

```text
/                              accueil du groupe (or et noir) : présentation, cartes des trois filiales,
                               contacts
/location                      accueil BPL (l'accueil actuel)
/location/flotte               flotte filtrable        /location/flotte/[slug]   fiche véhicule
/location/reglement            règlement des locations
/formation                     BPF : présentation, permis (modalités, prix), formulaire de contact
/cards                         BPC : catalogue par catégorie, recherche, carte grisée si épuisée
```
- Anciennes adresses (`/flotte`, `/flotte/[slug]`, `/reglement`) redirigées vers `/location/…`.
- En-tête contextuel (ajustement validé après F-2) : sur le groupe, logo du groupe et liens vers les filiales visibles ; dans une filiale, son logo, son nom et ses propres liens. Le header conserve son style initial or et verre, y compris dans les filiales, avec le nom compact sur deux lignes. Pour Location : Accueil, La flotte, Règlement. Un bouton « Retour au groupe » se place à droite d’« Espace admin ». Une seule barre de navigation ; le logo renvoie à l’accueil de l’espace courant. Les contacts restent dans les pages et le pied de page.
- Couleur de filiale (F6) : sert d'accent (titres en accent, boutons, filets, icônes) dans sa section ; l'or reste réservé au groupe. Contraste ≥ 4,5:1 vérifié pour chaque couleur.
- Pas de maquette pour ces nouvelles pages : composition avec les composants existants, capture montrée avant d'affiner.
- **Refonte graphique du site public (validée le 07/11/2026)** : nouvelle direction qui s'écarte des maquettes Claude Design pour la mise en page (les jetons restent la seule source des couleurs, verres et polices). Heros plein écran avec fond en parallaxe et halos de l'accent, logos en médaillon avec anneau de texte tournant, panneaux de filiales et de types extensibles au survol, bandeau défilant, chiffres animés, apparitions au défilement, en-tête collant qui se retire en descendant. Animations avec **Motion** (`motion/react`), primitives dans `src/composants/site/anime/` et composants dans `src/composants/site/Vitrine.tsx`. Tout est coupé si l'utilisateur réduit les animations ; les tests e2e tournent dans ce mode (`reducedMotion: "reduce"`). Le panel n'est pas concerné.

## 4. Black Pegasus Location (BPL)

Inchangé fonctionnellement (flotte, contrats, PDF, clôture de contrat, retards, dégâts). Changent : le préfixe des **nouveaux** contrats (`BPL-2026-0042` ; les `CTR-2026-…` existants gardent leur numéro), l'adresse publique (`/location`), les paramètres (ceux de la filiale) et un champ facultatif **n° de licence** du client sur le contrat (repris sur le PDF).

## 5. Black Pegasus Formation (BPF)

- **Vitrine seulement** : la délivrance des licences est gérée par l'État, pas par l'application.
- **Site** : permis regroupés par domaine (domaines libres, définis dans le panel), avec description, modalités et prix ; formulaire de contact (nom RP, téléphone en jeu, permis visé, message), limité en débit contre les abus.
- **Panel** : domaines et permis (ajout, modification, ordre, visibilité) ; boîte de réception des demandes (nouvelle / traitée), signalées dans la cloche.
- **Argent** : les formations encaissées sont saisies au solde (catégorie *Formation*, filiale BPF).
- **Catalogue initial validé en F-3** : Licence navigation (Navigation) et Licence pilotage (Aérien), à 4 000 $ chacune. Visite médicale en prérequis, questionnaire et test pratique comme épreuves. Durée non renseignée ; tous ces champs sont modifiables dans le panel.

## 6. Black Pegasus Cards (BPC)

- **Site** : cartes par catégorie, avec photo, nom, prix et exemplaires restants ; carte grisée et « Épuisée » à 0 ; bouton « Appeler pour acheter », comme pour les locations.
- **Panel** : catégories (un niveau), cartes (nom, prix, stock, photo facultative), **ventes saisies dans le panel** : carte, quantité, client → stock décrémenté (refus si insuffisant), recette *Vente de cartes* inscrite automatiquement, n° `BPC-2026-0001`. Une vente saisie par erreur s'annule par contre-passation (stock rendu), comme un contrat.

## 7. Comptabilité commune

- Un solde, un registre numéroté (`OP-45-012`), une clôture hebdomadaire, une déclaration FISC : **inchangés**.
- Chaque mouvement porte sa **filiale** (BPL, BPF, BPC) ou **Groupe** (impôts, frais communs). Ceux d'un contrat ou d'une vente la prennent automatiquement.
- Nouvelles catégories de mouvements : recettes **Formation** (BPF) et **Vente de cartes** (BPC) ; dépense **Achat de stock** (BPC). Les dépenses existantes (entretien, impôts, divers…) restent communes.
- Registre et solde filtrables par filiale ; synthèse, tableau de bord et PDF de déclaration avec un tableau « recettes / dépenses / résultat par filiale ». Le résultat imposable reste celui du groupe.

## 8. Panel

- Navigation : Tableau de bord, Solde, Comptabilité (groupe) ; **Location** (Véhicules, Contrats), **Formation** (Permis, Demandes), **Cards** (Cartes, Ventes) ; Comptes ; Paramètres.
- Paramètres : *Groupe* (nom, immatriculation, fuseau, accueil du groupe) puis une page par filiale (identité, couleur, contact, textes, et ce qui lui est propre).
- Rôle FISC : consultation des contrats, du solde, de la comptabilité **et des ventes de cartes** ; pas d'accès aux demandes de contact (données personnelles sans intérêt fiscal).

## 9. Couleurs

Charte : `docs/handoff/design/tokens.css` ne définit que l'or et le noir. Les couleurs de filiale seront ajoutées comme **jetons** dans `tokens-complementaires.css` (accent, texte sur accent, fond teinté), jamais en dur ; contraste ≥ 4,5:1 sur noir vérifié.

Couleurs retenues : **option A** (Q1).
| Filiale | Option A | Option B |
|---|---|---|
| Location | Bleu horizon `#6CB4E4` (8,7:1) | Turquoise lagon `#4FC3C7` (9,4:1) |
| Formation | Vert brevet `#5CC08F` (8,8:1) | Bleu pervenche `#8FA8EE` (8,5:1) |
| Cards | Violet holo `#B48CF0` (7,5:1) | Magenta `#E080BE` (7,5:1) |

Le rouge est exclu : il est réservé aux alertes (retards, actions destructrices).

**Logos** : fournis et rangés dans `public/images/logos/` (`bp-compagnie`, `bp-location`, `bp-formation`, `bp-cards`). Le logo actuel est celui de Location. Ceux de Compagnie, Formation et Cards sont sur fond noir carré : affichés en médaillon rond (le fond se confond avec celui du site) ; des versions détourées (PNG transparent) seraient un plus.

## 10. Phases proposées

| Phase | Contenu |
|---|---|
| F-1 | Modèle `Filiale`, reprise des données BPL, filiale sur les mouvements ; panel visuellement inchangé |
| F-2 | Site groupe : accueil groupe, section `/location`, redirections, couleurs de filiale ; identité, contact et visibilité des filiales dans les paramètres |
| F-3 | BPF : domaines et permis, page publique, formulaire et boîte de réception |
| F-4 | BPC : catégories, cartes, catalogue public, ventes et stock |
| F-5 | Comptabilité ventilée : registre, synthèse, tableau de bord, PDF de déclaration |
| F-6 | Paramètres par filiale (textes, règles), finitions, tests e2e et accessibilité |

## 11. Réponses

| N° | Question | Réponse |
|---|---|---|
| Q1 | Couleurs des filiales | Option A : bleu horizon (Location), vert brevet (Formation), violet holo (Cards) |
| Q2 | Logos | Un par filiale (fournis) ; le logo actuel est celui de Location |
| Q3 | Demandes de contact BPF | Dans le panel (boîte de réception + cloche) |
| Q4 | Licences BPF | Simple vitrine : la délivrance est gérée par l'État |
| Q5 | Licence sur les contrats BPL | Champ facultatif « n° de licence » |
| Q6 | Domaines des permis | Libres (paramétrables) |
| Q7 | Cartes | Catégories sur un niveau ; photo facultative ; nom, prix, stock |
| Q8 | Ventes de cartes | Saisies dans le panel (stock et recette automatiques) |
| Q9 | FISC | Voit aussi les ventes de cartes, en consultation |
| Q10 | Anciens contrats | Gardent `CTR-2026-…` ; `BPL-` pour les nouveaux |
| Q11 | Adresses | `/location`, `/formation`, `/cards` |
