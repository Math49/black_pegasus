# Black Pégasus – American Transports · Dossier de passation

Spécification fonctionnelle et visuelle du site public et du panel d’administration de **Black Pégasus – American Transports**, une agence de location de bateaux, d’avions et d’hélicoptères sur un serveur de jeu de rôle GTA V (FiveM).

- Langue de l’interface : **français**. Devise : **dollars ($)**, montants entiers.
- Aucune réservation en ligne : le site renvoie vers le téléphone en jeu ; tout le reste se gère dans le panel.
- Les maquettes sont **desktop** (1440 px). Le site public est construit en mise en page fluide, mais aucune version mobile n’a été dessinée. Le panel est un outil desktop.

> Les maquettes sont la référence visuelle. Ce document est la référence fonctionnelle. En cas d’écart, ce document l’emporte, et tout point marqué **[À VALIDER]** doit être confirmé avec le propriétaire du projet avant d’être codé en dur.

---

## 1. Contenu du dossier

| Dossier | Contenu | Usage |
|---|---|---|
| `maquettes/captures/` | 21 captures PNG pleine page | Référence visuelle rapide, écran par écran |
| `maquettes/html/` | 21 pages HTML statiques autonomes (polices et images locales) | Ouvrir dans un navigateur, inspecter le CSS exact |
| `maquettes/pdf/` | `contrat-CTR-2026-0042.pdf`, `declaration-FISC-S43.pdf` | Rendu attendu des deux documents générés |
| `maquettes/sources-canvas/` | Sources `.dc.html` d’origine + `canvas.json` | Logique d’interaction des maquettes (calculs, états) |
| `design/` | `tokens.css`, `tokens.json` | Couleurs, typographie, rayons, ombres, recettes de verre |
| `assets/images/` | Logo, 4 fonds d’ambiance, photo provisoire des véhicules | À réutiliser tels quels |
| `assets/fonts/` | Montserrat (500–700) et Manrope (400–800), WOFF2 + `fonts.css` | Hébergement local des polices |
| `data/` | `flotte.json`, `demo-semaine-43.json` | Données de démonstration cohérentes pour le seed |

Les pages HTML statiques montrent **l’état par défaut** de chaque écran (onglets, filtres et calculs figés). Le comportement interactif est décrit ici et visible dans `sources-canvas/` (voir § 9).

### Correspondance des écrans

| # | Écran | Capture / HTML | Route suggérée |
|---|---|---|---|
| 01 | Accueil | `01-site-accueil` | `/` |
| 02 | Flotte (catalogue) | `02-site-flotte` | `/flotte?type=bateaux` |
| 03 | Fiche véhicule | `03-site-fiche-vehicule` | `/flotte/[slug]` |
| 04 | Règlement des locations | `04-site-reglement` | `/reglement` |
| 05 | Système de composants | `05-systeme-de-composants` | — (référence) |
| 10 | Connexion | `10-admin-connexion` | `/admin/connexion` |
| 11 | Tableau de bord | `11-admin-tableau-de-bord` | `/admin` |
| 12 | Solde de l’entreprise | `12-admin-solde` | `/admin/solde` |
| 13 | Modale « Nouveau mouvement » | `13-admin-solde-nouveau-mouvement` | modale sur `/admin/solde` |
| 14 | Véhicules | `14-admin-vehicules` | `/admin/vehicules` |
| 15 | Ajout / modification d’un véhicule | `15-admin-vehicule-formulaire` | `/admin/vehicules/nouveau`, `/admin/vehicules/[id]` |
| 16 | Contrats (en cours / terminés) | `16-admin-contrats` | `/admin/contrats` |
| 17 | Nouveau contrat | `17-admin-contrat-nouveau` | `/admin/contrats/nouveau` |
| 18 | Clôture d’un contrat | `18-admin-contrat-cloture` | `/admin/contrats/[id]/cloture` |
| 19 | Comptabilité hebdomadaire | `19-admin-comptabilite` | `/admin/comptabilite?semaine=2026-S43` |
| 20 | Confirmation de clôture de semaine | `20-admin-comptabilite-cloture` | modale sur la comptabilité |
| 21 | Comptes autorisés | `21-admin-comptes` | `/admin/comptes` |
| 22 | Modale « Ajouter un compte » | `22-admin-comptes-ajout` | modale sur `/admin/comptes` |
| 30 | PDF du contrat | `30-pdf-contrat` | `/admin/contrats/[id]/pdf` |
| 31–32 | PDF de la déclaration FISC | `31-…`, `32-…` | `/admin/comptabilite/[semaine]/declaration.pdf` |

---

## 2. Direction artistique

Moderne, graphique, luxueux, avec un **glassmorphism** marqué : des panneaux de verre posés sur de grandes photos d’ambiance assombries. Inspirations retenues pour leur style seulement (aucun nom de marque ni logo repris).

### Couleurs (voir `design/tokens.css`)

| Rôle | Valeur |
|---|---|
| Noir profond (fond) | `#0A0A0C` |
| Surface | `#131316` |
| Or (dégradé) | `#A67C2E → #E8C877 → #C9A24A`, angle 100° |
| Or texte / icône | `#E8C877` / `#D6B467` |
| Argent | `#C8C8CC → #EDEDF0` |
| Texte | `#EDEDF0` |
| Texte atténué | `#8E8E96` |
| Alerte (retard, suppression) | bordure `#E07A6B`, texte `#F2A99D` — **panel uniquement** |

Règles d’usage :
- **Site public** : l’or sert aux accents, aux prix, aux boutons principaux et aux icônes. Aucune autre couleur vive.
- **Panel** : l’or est **réservé aux actions principales et aux chiffres clés** (solde, résultat imposable, entrées d’argent, total à encaisser). Les sorties d’argent sont en argent. Le rouge cuivré atténué n’apparaît que pour les retards et les actions destructrices, toujours accompagné d’une icône et d’un texte.

### Typographie

- Titres : **Montserrat** 600–700, interlettrage −0,01 em. (Le client a refusé les polices à empattement.)
- Texte et chiffres : **Manrope** 400–800. Chiffres en `font-variant-numeric: tabular-nums` et `white-space: nowrap`.
- Petits libellés : capitales, 10,5–11 px, interlettrage 0,2–0,24 em, graisse 700, couleur atténuée.
- Le mot-symbole « BLACK PÉGASUS » : Montserrat 700, interlettrage 0,14 em, texte en dégradé or.

### Recettes de verre

| Variante | Fond | Flou | Bordure | Reflet / ombre |
|---|---|---|---|---|
| Site | `rgba(255,255,255,.06)` | `blur(26px) saturate(140%)` | 1 px `rgba(255,255,255,.10)` | `inset 0 1px 0 rgba(232,200,119,.32)` + `0 30px 60px -24px rgba(0,0,0,.7)` |
| Panel | `rgba(255,255,255,.055)` | `blur(24px) saturate(130%)` | 1 px `rgba(255,255,255,.09)` | `inset 0 1px 0 rgba(232,200,119,.24)` + ombre douce |
| Modale | `rgba(24,24,28,.72)` | `blur(30px)` | 1 px `rgba(255,255,255,.12)` | reflet or `.35` + `0 40px 100px -20px rgba(0,0,0,.85)` |

Rayons : 20–24 px pour les panneaux, 12 px pour les champs et boutons du panel, 999 px pour les boutons du site et les pastilles.

### Fonds d’ambiance

- Site : photos assombries par dégradés (`bg-coucher-de-soleil`, `bg-mer`, `bg-piste-de-nuit`, `bg-skyline`).
- Panel : `bg-skyline` en plein écran avec `filter: blur(30px) brightness(.34) saturate(.9)` (calque débordant de 60 px), plus un halo or radial très léger en haut à droite.
- Connexion : `bg-coucher-de-soleil` avec vignettage radial.
- Les fonds ont été générés en attendant des captures en jeu ; la photo des véhicules est une **photo provisoire** commune à tous les modèles.

### Détails graphiques

Arcs et filets dorés fins inspirés du cercle du logo, icônes au trait (grille 24, trait 1,5–1,6, bouts arrondis), grands chiffres, filet or en dégradé (`.rule`).

---

## 3. Composants

Les classes ci-dessous existent dans les maquettes HTML ; s’en servir comme base pour des composants réutilisables.

| Composant | Classe(s) maquette | Notes |
|---|---|---|
| Bouton principal | `.btn .btn-gold` | Dégradé or, texte `#0A0A0C`. Site : pilule 52 px. Panel : 44 px, rayon 12 |
| Bouton secondaire | `.btn .btn-glass` | Verre, contour argent `rgba(200,200,204,.35–.5)` |
| Bouton destructif | `.btn .btn-danger` | Contour et texte alerte, fond transparent |
| Bouton icône | `.ibtn` | 44 × 44 (36 en tableau), `aria-label` obligatoire |
| Carte verre | `.glass` | Voir recettes ci-dessus |
| Carte véhicule | `.vcard` + `.media` | Photo 180–220 px avec fondu bas, badge de disponibilité, prix heure (or) et jour (argent), pastilles places / contenance |
| Badge de disponibilité (site) | `.badge-on` / `.badge-off` | Or si disponible (« 2 / 3 disponibles »), argent atténué si « Complet » |
| Statut (panel) | `.st-ok`, `.st-mute`, `.st-gold`, `.st-warn` | Pilule 24 px avec point ou icône |
| Pastille / étiquette | `.chip`, `.tag` | Places, contenance, catégorie |
| Champ | `.fld` + `label.flab` | 44–46 px, fond `rgba(10,10,12,.45)`, focus contour or + halo |
| Onglets segmentés | `.seg` / `.seg-on` | Site : segment actif en or ; panel : segment actif en verre clair |
| Interrupteur | `.switch` / `.switch-on` | `role="switch"` + `aria-checked` |
| Tableau | grille `.gr` / `.gh` / `.gd` | Grilles CSS, en-têtes en capitales, montants alignés à droite |
| Navigation latérale | `.nv` / `.nv-on` | Icône or sur l’élément actif, compteur `.cnt` (alerte : `.cnt-warn`) |
| Indicateur clé | `.kpi` | Libellé, grand chiffre, ligne de contexte |
| Modale | `.modal` | Page derrière floutée et assombrie `rgba(5,5,7,.62)` |

Accessibilité : vrais `<button>`, `<a href>`, `<input>` avec `<label>` ; contrastes ≥ 4,5:1 ; les états ne reposent jamais sur la couleur seule.

---

## 4. Site public

En-tête commun : verre en pilule, logo + mot-symbole, navigation (Accueil, La flotte, Règlement, La maison), bouton **« Espace admin »** (secondaire, cadenas) vers `/admin/connexion`, bouton or **« 555-XXXX »**. Pied de page : logo, liens, téléphone, horaires, mention « Entreprise fictive d’un serveur de jeu de rôle GTA V (FiveM) ».

**Chaque page met en avant « Réservez par téléphone en jeu : 555-XXXX » et les horaires.**

1. **Accueil** — Hero plein écran (coucher de soleil, arc doré, photo du véhicule vedette en cadre verre, carte téléphone + horaires, accroche « Le ciel et l’océan, à votre mesure », bouton « Découvrir la flotte »). Trois cartes Bateaux / Avions / Hélicoptères avec nombre de modèles et catégories. Sélection d’exception (3 véhicules). « Comment louer » en 3 étapes. Présentation de la maison. Bandeau d’appel.
2. **Flotte** — Onglets par type avec compteurs ; colonne de filtres en verre (catégories cochables, places, contenance, fourchette de prix à l’heure, interrupteur « Disponible uniquement ») ; grille de cartes ; tri ; état vide ; rappel « Le tarif journalier s’applique automatiquement s’il est plus avantageux ». Fond d’ambiance selon le type (mer, piste, skyline).
3. **Fiche véhicule** — Hero sur la photo du véhicule, badge de disponibilité, prix « à partir de », galerie (3 vignettes) ; 4 blocs carrés (places, contenance, catégorie, exemplaires disponibles) ; présentation + « À savoir avant de louer » ; carte tarifs (heure, jour, caution, mention du tarif journalier, gros bouton d’appel, horaires) ; véhicules similaires.
4. **Règlement** — Sommaire collant à gauche (verre), articles numérotés 01–06 : conditions de location, tarification, caution, retards, dégâts et pénalités (tableau), restitution.

Le site lit les mêmes données que le panel : seuls les véhicules **visibles sur le site** apparaissent, avec leur disponibilité en direct.

---

## 5. Panel d’administration

Gabarit commun : barre latérale en verre (logo, Tableau de bord, Solde, Véhicules, Contrats, Comptabilité, Comptes ; carte « Semaine 43 · ouverte » ; « Voir le site public » ; « Déconnexion ») + en-tête en verre (fil d’Ariane, titre, cloche de notifications, utilisateur avec avatar Discord, pseudo et rôle).

1. **Connexion** — Carte verre centrée, logo, bouton unique « Se connecter avec Discord ». (Le logo Discord n’a pas été reproduit : icône neutre. Utiliser le logo officiel selon les règles de marque de Discord.)
2. **Tableau de bord** — Solde en grand (or) + évolution de la semaine ; raccourcis « Nouveau mouvement » / « Nouveau contrat » ; 4 indicateurs (chiffre d’affaires de la semaine, dépenses, contrats en cours avec nombre de retards, cautions détenues) ; contrats en cours triés par heure de retour, ligne teintée + statut « Retard · 40 min » si dépassé ; graphique des recettes des 8 dernières semaines (semaine en cours en or).
3. **Solde** — Solde actuel très mis en avant + courbe de la semaine (ouverture → chaque jour) ; cartes Entrées / Sorties ; historique filtrable (recherche, catégorie, période) : n° et date, sens (entrée or / sortie argent), catégorie, motif, contrat lié, saisi par, justificatif (trombone), montant ; pagination. Modale **Nouveau mouvement** : sens, montant, catégorie, motif, date-heure, contrat lié facultatif, zone de dépôt du justificatif (capture d’écran PNG/JPG, 10 Mo) avec aperçu.
4. **Véhicules** — Compteurs (modèles, exemplaires, disponibles, loués, maintenance) ; filtre par type ; recherche ; tableau : photo, nom + immatriculations, catégorie + type, places, contenance, prix/heure, prix/jour, caution, exemplaires (disponibles / total + pastilles + état), visible sur le site (interrupteur), modifier. **Formulaire** : informations, type, catégorie, places, contenance, tarifs + caution (affiche le seuil où le journalier devient avantageux), liste des exemplaires (immatriculation, statut Disponible / Loué / Maintenance, détail, suppression, ajout), photo (remplacement), visibilité, aperçu de la carte du site, suppression (admin).
5. **Contrats** — Onglets En cours / Terminés ; recherche ; tableau : n°, client + téléphone, véhicule + immatriculation, début → retour (prévu ou réel), location, caution, statut, PDF, action. **Création** en deux colonnes : formulaire (client RP, téléphone en jeu, modèle, exemplaire, début, fin prévue, durées rapides) et récapitulatif en verre recalculé en direct (durée facturée, calcul horaire vs journalier, tarif appliqué et économie, location, caution, **total à encaisser** en or). **Clôture** : rappel du contrat, heure de retour réelle, retard calculé, dégâts cochables, note d’état des lieux, bilan (pénalités à encaisser, caution restituée, mouvements générés).
6. **Comptabilité hebdomadaire** — Sélecteur de semaine (lundi → dimanche) avec statut Ouverte / Clôturée (cadenas) ; synthèse : solde d’ouverture, recettes, dépenses, **résultat imposable**, cautions détenues (encadré pointillé, hors recettes), solde de clôture ; contrôles avant clôture ; registre numéroté (filtres Toutes / Recettes / Dépenses / Cautions) avec pièce (contrat ou justificatif) et trois colonnes de montants + totaux ; boutons « Exporter » et « Clôturer la semaine » (confirmation en tapant `CLÔTURER S43`). Semaine clôturée : registre verrouillé, lien vers la déclaration.
7. **Comptes** — Liste : avatar et pseudo Discord, identifiant, rôle, actif / inactif (interrupteur ; on ne peut pas se désactiver soi-même), ajouté le, ajouté par, dernière connexion. Modale d’ajout par identifiant Discord (vérification, aperçu du compte trouvé, choix du rôle).

### Documents PDF

- **Contrat** (A4, une page) : en-tête noir et or avec logo, n° `CTR-2026-0042`, date d’établissement, locataire, véhicule, période, tableau de tarification (horaire barré si non appliqué), caution, total encaissé, conditions résumées, deux zones de signature (locataire / gérant), pied de page.
- **Déclaration FISC** (A4, deux pages, sobre noir sur blanc) : identification (entreprise, activité, gérant, n° d’immatriculation, période), synthèse financière détaillée, contrats de la semaine, registre complet des opérations, attestation et signature du gérant.

---

## 6. Modèle de données (proposition)

Montants en **dollars entiers**. Dates stockées en UTC et affichées à l’**heure du serveur de jeu** (voir § 7.8).

```text
Vehicule      id, slug, nom, type (BATEAU | AVION | HELICOPTERE), categorie, places,
              contenanceKg, prixHeure, prixJour, caution, photoUrl, galerie[],
              description, visibleSurSite, creeLe, modifieLe, modifieParId
Exemplaire    id, vehiculeId, immatriculation (unique), statut (DISPONIBLE | LOUE | MAINTENANCE), note
Contrat       id, numero (CTR-AAAA-NNNN), clientNom, clientTelephone, exemplaireId,
              debut, finPrevue, retourReel?, heuresFacturees, tarifApplique (HORAIRE | JOURNALIER),
              montantLocation, caution, statut (EN_COURS | TERMINE),
              retardMinutes?, penaliteRetard?, penaliteDegats?, degats[]?, noteEtatDesLieux?,
              pdfUrl?, creeParId, clotureParId?
Mouvement     id, numero (OP-SS-NNN), semaineId, date, sens (ENTREE | SORTIE),
              categorie (LOCATION | PENALITE | CAUTION_ENCAISSEE | CAUTION_RENDUE | ACHAT_VEHICULE |
                         ENTRETIEN | IMPOTS | APPORT | DIVERS),
              montant, motif, contratId?, justificatifUrl?, justificatifNumero (JUST-SS-NN)?, saisiParId
Semaine       id, annee, numero, debut (lundi 00:00), fin (dimanche 23:59), statut (OUVERTE | CLOTUREE),
              soldeOuverture, soldeCloture?, clotureeLe?, clotureeParId?, declarationPdfUrl?
Compte        id, discordId (unique), pseudo, nomAffiche, avatarUrl, role (ADMIN | GESTIONNAIRE),
              actif, ajouteLe, ajouteParId, derniereConnexion
Parametres    telephoneAgence, horaires, toleranceRetardMin (15), majorationRetard (0.5),
              forfaitsDegats[] { libelle, montant }, numeroImmatriculationEntreprise
```

---

## 7. Règles métier

### 7.1 Tarification d’une location
- Heures facturées : `h = ceil(durée / 60 min)`, minimum 1 — toute heure entamée est due.
- `J = floor(h / 24)`, `r = h mod 24`.
- Prix horaire : `h × prixHeure`.
- Prix au journalier : `J × prixJour + min(r × prixHeure, prixJour)`.
- **Montant de la location = le plus petit des deux.** Le tarif journalier est « appliqué » s’il est strictement inférieur ; afficher alors l’économie pour le client.
- Exemple : Toro2, 12 h → horaire $7 200, journalier $3 600 → **$3 600**, + caution $5 000 = **$8 600 à encaisser**.

### 7.2 Caution
- Encaissée à la signature : mouvement `CAUTION_ENCAISSEE` (entrée). Elle compte dans le solde mais **pas dans les recettes**.
- Restituée à la clôture : mouvement `CAUTION_RENDUE` (sortie), intégrale.
- Les pénalités sont encaissées **à part** (mouvement `PENALITE`). **[À VALIDER]** variante : retenir les pénalités sur la caution.

### 7.3 Retard
- Tolérance : 15 min (paramètre).
- Heures de retard facturées : `ceil((retardMinutes − 15) / 60)` si positif, sinon 0.
- Pénalité de retard : `heures × prixHeure × 1,5` (majoration de 50 %, paramètre).
- Plus de 3 h de retard sans nouvelles : défaut de restitution, à traiter manuellement.
- Exemple : Seashark2 rendu 40 min après l’heure prévue → 1 h facturée → **$225**.

### 7.4 Dégâts
Forfaits paramétrables cochés à la clôture (exemples : rayures $500, réservoir non refait $250, dégât important $1 000) ; pénalité de dégâts = somme. Les montants définitifs sont **[À VALIDER]**.

### 7.5 Disponibilité
- Un exemplaire passe à `LOUE` à la création du contrat et à `DISPONIBLE` à sa clôture. `MAINTENANCE` se règle à la main.
- Affichage : « x / y disponibles » (x = exemplaires `DISPONIBLE`, y = total) ; « Complet » si x = 0.
- Un exemplaire non disponible ne peut pas être choisi dans un nouveau contrat.

### 7.6 Semaine fiscale et clôture
- Une semaine va du **lundi 00:00 au dimanche 23:59** (heure du serveur).
- Recettes = `LOCATION` + `PENALITE`. Dépenses = `ENTRETIEN` + `IMPOTS` + `ACHAT_VEHICULE` + `DIVERS`. **Résultat imposable = recettes − dépenses.** Les cautions et les apports sont exclus du résultat.
- Solde = somme de tous les mouvements (entrées − sorties), cautions comprises. Solde de clôture d’une semaine = solde d’ouverture de la suivante.
- Contrôles avant clôture : chaque dépense a un justificatif ; la numérotation est continue ; le solde est rapproché ; les contrats en cours sont signalés (ils passent sur la semaine suivante et leurs cautions restent détenues).
- Clôture réservée aux administrateurs, avec confirmation textuelle. Elle verrouille le registre (plus d’ajout ni de modification), génère la déclaration PDF et ouvre la semaine suivante.

### 7.7 Numérotation
- Contrats : `CTR-{année}-{nnnn}`, séquence annuelle.
- Opérations : `OP-{semaine}-{nnn}`, séquence par semaine.
- Justificatifs : `JUST-{semaine}-{nn}`.
- Déclarations : `DEC-{année}-S{semaine}`.

### 7.8 Heure du serveur
Tous les calculs de durée se font sur des dates **sans changement d’heure** (UTC), sinon une location de 22:00 à 10:00 la nuit du passage à l’heure d’hiver est comptée 13 h au lieu de 12 h. Ce cas a été corrigé dans les maquettes.

### 7.9 Rôles

| Action | Administrateur | Gestionnaire |
|---|---|---|
| Contrats (créer, clôturer, PDF) | ✔ | ✔ |
| Véhicules (créer, modifier) | ✔ | ✔ |
| Supprimer un véhicule | ✔ | — |
| Mouvements du solde | ✔ | ✔ |
| Clôturer une semaine, exporter la déclaration | ✔ | — (brouillon uniquement) |
| Gérer les comptes | ✔ | — |

### 7.10 Authentification Discord
- OAuth2 Discord, scope `identify`. Accès accordé seulement si l’identifiant Discord figure dans `Compte` et que le compte est actif. Aucun mot de passe stocké.
- Avatar et pseudo récupérés depuis Discord à chaque connexion ; `derniereConnexion` mise à jour.
- Un administrateur ne peut pas désactiver son propre compte.

---

## 8. Contenus provisoires à remplacer

| Élément | Valeur actuelle | Statut |
|---|---|---|
| Téléphone de l’agence | `555-XXXX` | À fournir |
| Horaires | « Tous les jours · 14h – 02h » | Exemple |
| Tarifs, places, contenances, cautions | `data/flotte.json` | Exemples cohérents avec le site |
| Forfaits de dégâts, tolérance, majoration | $500 / $250 / $1 000, 15 min, 50 % | **[À VALIDER]** |
| N° d’immatriculation de l’entreprise | `[N° D’IMMATRICULATION]` | À fournir |
| Date de mise à jour du règlement | `[DATE]` | À fournir |
| Nom « Streamer 2026 » | Tel que fourni | **[À VALIDER]** : peut-être le « Streamer216 » du jeu |
| Photos des véhicules | `vehicule-placeholder.jpg` pour tous | À remplacer par des captures en jeu |
| Fonds d’ambiance | Images générées | Remplaçables par des captures |
| Personnages, contrats, mouvements | `data/demo-semaine-43.json` | Données de démonstration |

---

## 9. Lire les sources `.dc.html`

Les fichiers de `maquettes/sources-canvas/` sont des maquettes interactives :
- le balisage est entre `<x-dc>` et `</x-dc>` ; le `<helmet>` contient les styles de page ;
- `{{ chemin }}` insère une valeur calculée ; `<sc-for list="{{ liste }}" as="x">` répète ; `<sc-if value="{{ cond }}">` affiche sous condition ;
- le bloc `<script type="text/x-dc">` contient une classe `Component` dont la méthode `renderVals()` calcule ces valeurs et les gestionnaires d’événements (`onClick`, `onChange`).

Les calculs à reprendre se trouvent dans `Admin-Contrat-Nouveau.dc.html` (tarification), `Admin-Contrat-Cloture.dc.html` (retard et pénalités) et `Admin-Compta.dc.html` (registre et totaux). Ces fichiers servent de référence ; ils ne sont pas destinés à être exécutés tels quels.

---

## 10. Suggestion de stack **[À VALIDER]**

Rien n’impose de technologie. Une base qui couvre le besoin : Next.js (App Router, TypeScript) + Tailwind CSS avec les tokens de `design/tokens.css` ; Prisma + PostgreSQL (ou SQLite pour démarrer) ; Auth.js avec le fournisseur Discord ; stockage des justificatifs et photos sur disque ou S3 compatible ; génération des PDF par rendu HTML → PDF (Playwright) à partir des gabarits 30–32.
