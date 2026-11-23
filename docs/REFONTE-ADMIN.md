# Refonte de l'espace admin (R-1 à R-5)

> Décisions validées avec l'utilisateur le 23/11/2026, puis plan d'exécution. Ce document prime sur `CONCEPTION.md`, `CONCEPTION-FILIALES.md` et le HANDOFF pour les points qu'il traite. Le panel est utilisé **uniquement sur PC** : aucun travail spécifique au mobile n'est demandé.

## 0. État

| Phase | Contenu | État |
|---|---|---|
| **R-1** | Navigation par filiale, icônes, tableau de bord du groupe | Terminée (`7ed1add`) |
| **R-2** | Comptabilité : nature par le sens, impôt sur les recettes, catégories de mouvements personnalisables | Terminée (`a0a50d9`) |
| **R-3** | Gestion des cartes à gros volume, glisser-déposer | Terminée (`c136c4a`) |
| **R-4** | Ventes de plusieurs cartes, montant encaissé modifiable | Terminée, à valider |
| **R-5** | Enchères (panel et site public) | À faire |

## 1. Navigation et tableau de bord (R-1)

- **Barre latérale** groupée par filiale :
  - **Groupe** : Tableau de bord, Solde, Comptabilité ;
  - **Location** : Véhicules, Contrats ;
  - **Formation** : Permis, Demandes ;
  - **Cards** : Cartes, Ventes ;
  - **Administration** : Comptes, Paramètres.
- Une icône distincte par entrée (plus de doublon Permis/Contrats ni Demandes/Comptes).
- **Tableau de bord commun** :
  - solde du groupe et évolution de la semaine ;
  - indicateurs : recettes, dépenses, impôt estimé, cautions détenues ;
  - recettes de la semaine par filiale et graphique des 8 dernières semaines ;
  - un bloc par filiale : Location (contrats en cours, retards), Formation (nouvelles demandes), Cards (ventes de la semaine, cartes épuisées ; enchères qui se terminent bientôt à partir de R-5) ;
  - raccourcis : nouveau mouvement, nouveau contrat, nouvelle vente.
- Chaque bloc n'apparaît que si le rôle a la permission correspondante.
- **Livré en R-1** : l'indicateur « Résultat imposable » reste calculé selon l'ancienne règle ; R-2 le remplace par « Impôt dû ». Nouvelle icône `diplome` (Permis). Le lien `/admin/cards/ventes?nouvelle=1` ouvre directement la modale de vente. Captures : `docs/validations/r1/`.

## 2. Comptabilité (R-2)

- **Nature par le sens** : toute entrée est une recette, toute sortie une dépense, **apports compris**. Seules les **cautions** (encaissées et rendues) restent hors recettes et hors dépenses.
- Une contre-passation annule le mouvement d'origine dans sa propre nature : la contre-passation d'une recette diminue les recettes (elle n'est pas comptée comme dépense), et inversement.
- **Impôt** : « Base imposable » = recettes de la semaine ; « Impôt dû » = base × taux. Les dépenses ne réduisent plus l'impôt. Le taux (20 %) est stocké dans `Parametres`, modifiable par un administrateur.
- **Semaines clôturées** : les nouvelles règles s'appliquent à partir de la semaine ouverte. Les chiffres d'une semaine sont **figés à la clôture** (instantané en base) ; les semaines déjà clôturées gardent leurs chiffres et leurs PDF archivés.
- **Catégories de mouvements** gérées dans les Paramètres (table au lieu de l'enum) :
  - nom, sens autorisé (entrée, sortie ou les deux), filiale par défaut facultative, justificatif obligatoire ou non ;
  - catégories utilisées automatiquement (Location, Pénalité, Caution encaissée, Caution rendue, Formation, Vente de cartes) : renommables, non supprimables ;
  - une catégorie déjà utilisée ne se supprime pas, elle s'archive (plus proposée à la saisie).

- **Livré en R-2** :
  - table `CategorieMouvement` (identifiant = ancien code pour les douze catégories reprises), migration `20261123120000_categories_mouvements` ; onglet **Paramètres → Comptabilité** (taux d'impôt, catégories : création, modification, archivage, suppression si inutilisée) ;
  - `Semaine.regleComptable` (1 pour les semaines clôturées avant la migration, 2 ensuite) et `Semaine.tauxImpot` figé à la clôture ; `Parametres.tauxImpot` (20 par défaut) ;
  - « Impôts » est aussi une catégorie système (lue par les calculs : « dont impôt S42 ») ; « Achat de stock » n'impose plus la filiale Cards, il la propose ;
  - comptabilité, déclaration PDF, CSV et tableau de bord affichent « Impôt dû · 20 % » ; une semaine en règle 1 garde « Résultat imposable » ;
  - captures : `docs/validations/r2/`.

## 3. Gestion des cartes (R-3)

- Écran en deux volets : à gauche, les **catégories** (nombre de cartes, ordre par glisser-déposer, ajout, renommage, suppression si vide) ; à droite, la **grille** des cartes de la catégorie choisie.
- Recherche sur toutes les catégories ; filtres visible / masquée, en stock / épuisée, vente / enchère.
- Ordre des cartes par glisser-déposer, repris tel quel sur le site public ; déposer une carte sur une catégorie l'y déplace.
- Ajustement rapide du stock (+ / −) ; édition complète dans un panneau.
- La gestion des catégories de cartes quitte les Paramètres pour cet écran.
- Glisser-déposer accessible au clavier (bibliothèque à proposer au début de R-3).

- **Livré en R-3** : bibliothèque `@dnd-kit` (glisser-déposer à la souris et au clavier : Espace, flèches, Espace ; annonces en français). Le champ « Ordre » disparaît des formulaires : une carte ou une catégorie créée va en fin de liste, une carte qui change de catégorie aussi. Ajustement du stock (+ / −) journalisé comme une correction. Recherche, filtre de visibilité et de stock ; le glisser-déposer des cartes est désactivé pendant un filtre. Capture : `docs/validations/r3/`.

## 4. Ventes (R-4)

- Une vente = un numéro `BPC-AAAA-NNNN`, **plusieurs lignes** (carte, quantité, prix unitaire figé), **un seul mouvement**.
- Sélection par recherche et filtre de catégorie ; seules les cartes **en stock** et **hors enchère** sont proposées ; quantité plafonnée au stock.
- **Montant encaissé** : proposé au total catalogue (calculé côté serveur), modifiable à la baisse, jamais au-dessus du total. La remise est enregistrée et affichée.
- L'annulation porte sur toute la vente (stock rendu, contre-passation).

- **Livré en R-4** : table `LigneVente` (migration `20261123140000_ventes_multi_cartes`, reprise de chaque vente existante en une ligne) ; `VenteCarte` porte `montantCatalogue`, `remise` et `montant` (encaissé). Saisie en deux colonnes : cartes en stock filtrables (recherche, catégorie), vente avec quantités ; l'encaissé vide vaut le prix du catalogue. Le motif du registre mentionne la remise. Capture : `docs/validations/r4/`.

## 5. Enchères (R-5)

- **Mode de vente** : vente classique ou enchère, choisi à l'ajout d'une carte ; une carte existante peut aussi être mise en enchère si aucune enchère n'est en cours.
- **Paramètres d'une enchère** : montant de départ, pas minimum, durée (heures), temps additionnel (minutes). Une enchère porte sur **1 exemplaire**.
- **Prolongation** : si une enchère arrive alors qu'il reste moins que le temps additionnel, la fin devient l'heure de cette enchère + le temps additionnel.
- **Validité d'une offre** : la première ≥ montant de départ ; les suivantes ≥ meilleure offre + pas. Une personne peut surenchérir sur sa propre offre.
- **Site public** :
  - la carte s'affiche parmi les autres avec un marquage « Enchère », la meilleure offre et le temps restant ;
  - un clic ouvre la page d'enchère : carte (filigrane et anti-copie), montant actuel, temps restant, dernières offres (montant et heure, **aucun nom**), formulaire nom, téléphone, montant ;
  - actualisation automatique toutes les 15 secondes environ ; envois limités (anti-spam).
- **Panel** :
  - dans la liste, les cartes en enchère montrent la meilleure offre et le temps restant ;
  - un clic ouvre le même aperçu que le public, sans formulaire, avec **noms et téléphones** des enchérisseurs (administrateurs et gestionnaires seulement, pas le FISC) ;
  - la cloche signale chaque nouvelle offre et chaque enchère terminée ;
  - un administrateur peut invalider une offre fantaisiste (journalisé).
- **Fin** : l'enchère passe à « Terminée · à conclure ». Après paiement en jeu, « Conclure » crée la vente (montant de l'offre gagnante, client gagnant), le mouvement et décrémente le stock. Si le gagnant ne paie pas : passer à l'enchérisseur suivant ou annuler. Sans offre : relancer ou repasser en vente classique.
