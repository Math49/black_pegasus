# Phase F-3 — Formation

## Catalogue validé

| Domaine | Licence | Tarif | Prérequis | Épreuves |
|---|---|---|---|---|
| Navigation | Licence navigation | 4 000 $ | Visite médicale | Questionnaire et test pratique |
| Aérien | Licence pilotage | 4 000 $ | Visite médicale | Questionnaire et test pratique |

Ces deux licences remplacent les exemples envisagés dans le plan initial. La durée n’a pas été précisée et reste vide. Toutes ces données se modifient dans le panel. La délivrance des licences reste gérée par l’État.

## Livrables

- `/formation` : catalogue par domaine, contact de BPF et formulaire public ; accent vert et header or conservé.
- `/admin/formation/permis` : domaines libres (nom, ordre), permis (description, modalités, tarif, ordre, visibilité), suppression logique des permis. Un domaine utilisé, même par un permis supprimé, ne se supprime pas.
- `/admin/formation/demandes` : nouvelles demandes ou historique complet, coordonnées en jeu, permis visé, message, traitement daté et attribué ; liste paginée par 30 demandes.
- Navigation Formation, compteur des nouvelles demandes et notification dans la cloche. Administrateur et gestionnaire seulement : le FISC n’a ni accès aux pages, ni lien de navigation, ni notification Formation.

## Données et protection du formulaire

La migration `20261107160000_formation` crée `DomainePermis`, `Permis`, `DemandeContact` et `StatutDemande`. `JournalAudit.compteId` devient facultatif pour journaliser la réception publique sous « Site public ». Cet événement ne recopie ni message, ni coordonnées ; il référence uniquement l’identifiant de la demande.

L’action publique est l’exception prévue au contrôle de session : Zod, cinq tentatives par adresse sur dix minutes, champ piège anti-robot, service en transaction et audit. L’IP sert seulement au limiteur en mémoire ; elle n’est pas stockée. Une seule instance d’application est supposée, comme pour les limiteurs existants. Une filiale masquée, ou un permis masqué/supprimé entre l’affichage et l’envoi, est contrôlé à nouveau côté serveur.

Le seed rend Formation visible et ajoute deux demandes de démonstration, sans modifier la comptabilité. L’initialisation de production crée les deux licences validées seulement si les tables du catalogue sont vides ; elle conserve les paramètres de visibilité existants et ne crée aucune demande de démonstration. Aucune dépendance ou variable d’environnement supplémentaire n’est nécessaire.

Le parcours par la cloche a aussi permis de corriger sa superposition : l’en-tête du panel reste au-dessus des cartes suivantes pour que les liens de notification soient cliquables.

## Validation

- Migration appliquée et base confirmée à jour ; seed exécuté et vérifié avant la suite complète.
- `npm run lint`, `npm test` et `npm run build` réussis.
- Tests unitaires : **297 tests réussis dans 28 fichiers**.
- Couverture du domaine : **100 % des lignes et des fonctions**, **99,85 % des instructions**, **98,37 % des branches** ; nouveau module Formation entièrement couvert.
- `npm run test:e2e -- --workers=1` : **86 tests réussis**, dont les sept parcours Formation.
- Axe sans violation sur Formation, les deux écrans du panel et la modale de permis ; largeurs 390, 768, 1024 et 1440 px sans débordement de page sur les nouveaux écrans.
- Les tests restaurent les visibilités, suppriment leurs demandes/domaines/permis et leurs entrées d’audit. Aucun mouvement comptable n’est créé par Formation.

Les durées restent à renseigner si souhaité. Les tarifs, prérequis et épreuves fournis par l’utilisateur sont déjà intégrés. La visibilité de Formation en production reste à activer dans le panel quand la filiale doit ouvrir.

## Captures initiales

Présentées avant la passe de validation :

- [Page Formation](formation-premier-rendu.jpg)
- [Gestion des permis](permis-premier-rendu.jpg)
- [Boîte de réception](demandes-premier-rendu.jpg)

## Captures finales

- [Formation](formation.jpg)
- [Formation sur mobile](formation-mobile.jpg)
- [Permis](permis.jpg)
- [Demandes](demandes.jpg)
