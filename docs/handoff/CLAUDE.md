# Projet Black Pégasus – American Transports

Site public et panel d’administration d’une agence de location de bateaux, d’avions et d’hélicoptères sur un serveur de jeu de rôle GTA V (FiveM).

## Sources de vérité
- `HANDOFF.md` : spécification fonctionnelle et visuelle. Elle prime sur les maquettes en cas d’écart.
- `maquettes/captures/*.png` et `maquettes/html/*.html` : référence visuelle, écran par écran. Reprendre les valeurs exactes (tailles, espacements, couleurs) depuis le CSS des pages HTML.
- `design/tokens.css` : seules couleurs, ombres, recettes de verre et polices autorisées.
- `data/*.json` : données de démonstration pour le seed.

## Règles
- Interface en **français**, montants en **dollars entiers** affichés `$28 000` (espace insécable comme séparateur de milliers), chiffres en `tabular-nums` et sans retour à la ligne.
- Polices : Montserrat (titres) et Manrope (texte), servies en local depuis `assets/fonts/`. Pas de police à empattement.
- Or réservé aux actions principales, aux prix et aux chiffres clés. Couleur d’alerte (`--bp-alert`) seulement pour les retards et actions destructrices, toujours avec icône + texte.
- Aucune réservation en ligne : chaque page du site met en avant le téléphone en jeu et les horaires.
- Calculs de tarif, retard, caution et comptabilité : suivre exactement `HANDOFF.md` § 7, avec des tests unitaires sur les exemples chiffrés qui y figurent.
- Dates stockées en UTC, calculs de durée sans changement d’heure (§ 7.8).
- Accessibilité : vrais `button` / `a` / `label`, `aria-label` sur les boutons-icônes, contraste ≥ 4,5:1, cibles ≥ 44 px.
- Ne pas coder en dur les points marqués **[À VALIDER]** ni les contenus provisoires (§ 8) : les placer dans une configuration ou en base.
- Ne pas ajouter de fonctionnalité absente de la spécification sans la proposer d’abord.
