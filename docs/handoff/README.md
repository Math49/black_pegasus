# Black Pégasus – American Transports · maquettes et spécification

Ce dossier contient tout ce qu’il faut pour développer, avec Claude Code, le site public et le panel d’administration de Black Pégasus (agence de location de bateaux, d’avions et d’hélicoptères sur un serveur RP GTA V / FiveM).

## Arborescence

```text
black-pegasus-handoff/
├── README.md                 ← ce fichier
├── CLAUDE.md                 ← consignes pour Claude Code
├── HANDOFF.md                ← spécification complète (design, écrans, données, règles métier)
├── design/
│   ├── tokens.css            ← variables CSS (couleurs, verre, typo, rayons)
│   └── tokens.json
├── assets/
│   ├── images/               ← logo, fonds d’ambiance, photo provisoire des véhicules
│   └── fonts/                ← Montserrat + Manrope en WOFF2, fonts.css
├── data/
│   ├── flotte.json           ← les 9 modèles et leurs 12 exemplaires
│   └── demo-semaine-43.json  ← comptes, contrats, 35 mouvements, semaines S42–S43
└── maquettes/
    ├── captures/             ← 21 captures PNG (référence visuelle)
    ├── html/                 ← 21 pages HTML statiques, ouvrables hors ligne
    ├── pdf/                  ← contrat et déclaration FISC en PDF
    └── sources-canvas/       ← sources interactives d’origine (.dc.html)
```

## Démarrer avec Claude Code

1. Décompresse ce dossier dans ton dépôt, par exemple dans `docs/black-pegasus/`. Si tu pars d’un dépôt vide, tu peux aussi le mettre à la racine : `CLAUDE.md` sera alors lu automatiquement.
2. Si le dossier est dans `docs/`, copie le contenu de `CLAUDE.md` dans le `CLAUDE.md` à la racine de ton projet (ou ajoute-y une ligne qui pointe vers `docs/black-pegasus/HANDOFF.md`).
3. Lance Claude Code dans le dépôt et commence par une demande de ce type :

> Lis `docs/black-pegasus/HANDOFF.md` et regarde les captures de `docs/black-pegasus/maquettes/captures/`. Propose-moi une stack et un plan de développement par étapes, en commençant par le design system et le site public, puis le panel admin. Liste les points marqués [À VALIDER] avant d’écrire du code.

Ensuite, avance écran par écran, par exemple :

> Implémente la page Flotte (capture `02-site-flotte.png`, HTML `maquettes/html/02-site-flotte.html`) en respectant `design/tokens.css` et les données de `data/flotte.json`.

## À savoir

- Les pages de `maquettes/html/` montrent l’état par défaut des écrans ; le comportement (filtres, calculs, onglets) est décrit dans `HANDOFF.md`.
- Les tarifs, le téléphone `555-XXXX`, les horaires et les montants de pénalités sont des **exemples à remplacer** (liste complète dans `HANDOFF.md`, § 8).
- La photo des véhicules est provisoire et commune à tous les modèles ; les fonds d’ambiance ont été générés en attendant des captures en jeu.
