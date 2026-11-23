-- Refonte de l'espace admin, R-2 (docs/REFONTE-ADMIN.md § 2) :
-- catégories de mouvements en table, règle de calcul par semaine, taux d'impôt.

-- 1. La catégorie d'un mouvement devient un identifiant texte (l'ancien code de l'enum).
ALTER TABLE "Mouvement" ALTER COLUMN "categorie" TYPE TEXT USING "categorie"::text;
DROP TYPE "CategorieMouvement";

-- 2. Table des catégories, reprise des douze catégories existantes.
CREATE TYPE "SensCategorie" AS ENUM ('ENTREE', 'SORTIE', 'LES_DEUX');

CREATE TABLE "CategorieMouvement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sens" "SensCategorie" NOT NULL,
    "filiale" "CodeFiliale",
    "justificatifObligatoire" BOOLEAN NOT NULL DEFAULT false,
    "systeme" BOOLEAN NOT NULL DEFAULT false,
    "archivee" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategorieMouvement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategorieMouvement_nom_key" ON "CategorieMouvement"("nom");

INSERT INTO "CategorieMouvement" ("id", "nom", "sens", "filiale", "justificatifObligatoire", "systeme", "ordre") VALUES
    ('LOCATION',          'Location',          'ENTREE', 'BPL', false, true,  1),
    ('PENALITE',          'Pénalité',          'ENTREE', 'BPL', false, true,  2),
    ('CAUTION_ENCAISSEE', 'Caution encaissée', 'ENTREE', 'BPL', false, true,  3),
    ('CAUTION_RENDUE',    'Caution rendue',    'SORTIE', 'BPL', false, true,  4),
    ('FORMATION',         'Formation',         'ENTREE', 'BPF', false, true,  5),
    ('VENTE_CARTES',      'Vente de cartes',   'ENTREE', 'BPC', false, true,  6),
    ('IMPOTS',            'Impôts',            'SORTIE', NULL,  true,  true,  7),
    ('APPORT',            'Apport',            'ENTREE', NULL,  false, false, 8),
    ('ACHAT_VEHICULE',    'Achat de véhicule', 'SORTIE', 'BPL', true,  false, 9),
    ('ENTRETIEN',         'Entretien',         'SORTIE', 'BPL', true,  false, 10),
    ('DIVERS',            'Divers',            'SORTIE', NULL,  true,  false, 11),
    ('ACHAT_STOCK',       'Achat de stock',    'SORTIE', 'BPC', true,  false, 12);

ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_categorie_fkey"
    FOREIGN KEY ("categorie") REFERENCES "CategorieMouvement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Règle de calcul : les semaines déjà clôturées gardent l'ancienne (chiffres figés).
ALTER TABLE "Semaine" ADD COLUMN "regleComptable" INTEGER NOT NULL DEFAULT 2,
                      ADD COLUMN "tauxImpot" INTEGER;
UPDATE "Semaine" SET "regleComptable" = 1 WHERE "statut" = 'CLOTUREE';

-- 4. Taux de l'impôt hebdomadaire (pourcentage des recettes).
ALTER TABLE "Parametres" ADD COLUMN "tauxImpot" INTEGER NOT NULL DEFAULT 20;
