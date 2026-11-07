# Phase F-2 — Site groupe et paramètres des filiales

L’accueil `/` présente désormais Black Pégasus Compagnie. Le site de location se trouve sous `/location`, avec la flotte et le règlement dans cette section. Les anciennes adresses redirigent en 308 et conservent les paramètres de recherche.

Les filiales visibles sont triées par ordre d’affichage puis par code. Leur identité, leur contact, leur logo et leur visibilité se modifient dans Paramètres. Formation et Cards restent masquées dans les données initiales ; si elles sont activées, leur page présente leur identité et leur contact. Les permis, demandes, catalogues et ventes restent les livrables de F-3 et F-4.

Le groupe, le panel et les PDF gardent la palette or. Les sections de filiale utilisent les accents prévus : bleu pour Location, vert pour Formation, violet pour Cards. Les contrastes des accents et du texte sur les boutons sont vérifiés par les tests navigateur.

Après le retour utilisateur sur F-2, la barre principale devient celle de la filiale visitée : logo, nom et liens propres à cette filiale. Elle conserve son style initial or et verre, avec un nom compact sur deux lignes. Location affiche Accueil, La flotte et Règlement. « Retour au groupe » apparaît à droite d’« Espace admin ». Le logo renvoie à l’accueil de l’espace courant et la seconde barre de Location est retirée. La navigation s’adapte également lors d’un changement de page sans rechargement, et dans le menu mobile.

Cet ajustement a été validé par le lint, les 273 tests unitaires, la compilation de production et les tests ciblés des fichiers `site.spec.ts`, `filiales.spec.ts` et `finitions.spec.ts` (27 parcours). L’audit mobile attend le titre et la fin du chargement avant de démarrer axe.

Le maintien du style initial or et verre a ensuite été revérifié par les 12 tests du site, le lint et le build ; les captures de Location ont été actualisées.

La migration `20261107140000_site_groupe` ajoute `Parametres.textesGroupe` et renseigne les installations existantes. Le seed et l’initialisation de production utilisent les mêmes textes de départ. Aucune nouvelle variable d’environnement ni dépendance d’exécution n’est nécessaire.

Une filiale masquée affiche la page introuvable sur toute sa section. Avec le rendu en streaming de Next.js, le statut HTTP peut rester 200 si l’envoi de la réponse a commencé ; la page porte alors `noindex`, comme les fiches de véhicule introuvables existantes. Les tests vérifient la page introuvable et cette directive.

Les textes de départ de l’accueil du groupe et les accroches restent à relire dans le panel. Les logos Compagnie, Formation et Cards sont affichés en médaillon rond ; des fichiers détourés pourront les remplacer. Les déclarations archivées ne sont pas régénérées.

## Validation

- Migration appliquée ; `prisma migrate status` confirme une base à jour.
- Seed de démonstration exécuté et vérifié avant la suite complète.
- `npm run lint` et `npm run build` réussis.
- `npm test` : 273 tests réussis dans 27 fichiers.
- `npm run test:e2e -- --workers=1` : 78 tests réussis, dont les sept parcours de F-2.
- Après le dernier ajustement de l’en-tête mobile : les 19 tests du site et de ses finitions repassent au vert.
- Contrastes des trois accents vérifiés ; axe sans violation sur les pages testées ; aucune largeur de page supérieure au viewport à 390, 768, 1024 et 1440 px.

## Captures

Le premier rendu de l’accueil a été présenté avant les ajustements. Les captures finales sont conservées avec ce bilan :

- [Accueil du groupe](accueil-groupe.jpg)
- [Accueil Location](accueil-location.jpg)
- [Accueil sur mobile](accueil-mobile.jpg)
- [Paramètres des filiales](parametres-filiales.jpg)
- [Barre de Location après ajustement](navbar-location.jpg)
- [Menu de Location sur mobile](navbar-location-mobile.jpg)
