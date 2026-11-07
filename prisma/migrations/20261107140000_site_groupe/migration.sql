-- Textes de départ modifiables dans le panel, également sur les installations existantes.
ALTER TABLE "Parametres" ADD COLUMN "textesGroupe" JSONB NOT NULL DEFAULT '{}';

UPDATE "Parametres" SET "textesGroupe" = '{
  "accroche": {
    "titre": "Plusieurs horizons, *une même exigence*",
    "texte": "Black Pégasus Compagnie réunit des activités au service des habitants de San Andreas. Découvrez nos filiales et échangez directement avec leurs équipes en jeu."
  },
  "presentation": {
    "titre": "Un groupe, *des savoir-faire*",
    "texte": "Location, formation et cartes de collection : chaque filiale Black Pégasus porte sa spécialité, avec la même attention au conseil et à la qualité du service. Retrouvez ici nos activités et les coordonnées de nos équipes."
  }
}'::jsonb;
