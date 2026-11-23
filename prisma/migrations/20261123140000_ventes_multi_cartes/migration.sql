-- Refonte de l'espace admin, R-4 (docs/REFONTE-ADMIN.md § 4) :
-- une vente porte plusieurs lignes ; le montant encaissé peut être inférieur au catalogue.

-- 1. Lignes de vente.
CREATE TABLE "LigneVente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "carteId" TEXT NOT NULL,
    "carteNom" TEXT NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,

    CONSTRAINT "LigneVente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LigneVente_venteId_idx" ON "LigneVente"("venteId");
CREATE INDEX "LigneVente_carteId_idx" ON "LigneVente"("carteId");

-- 2. Reprise : chaque vente existante devient une vente d'une ligne, sans remise.
INSERT INTO "LigneVente" ("id", "venteId", "carteId", "carteNom", "prixUnitaire", "quantite", "montant")
SELECT 'reprise-' || "id", "id", "carteId", "carteNom", "prixUnitaire", "quantite", "montant"
FROM "VenteCarte";

ALTER TABLE "VenteCarte" ADD COLUMN "montantCatalogue" INTEGER,
                         ADD COLUMN "remise" INTEGER NOT NULL DEFAULT 0;
UPDATE "VenteCarte" SET "montantCatalogue" = "montant";
ALTER TABLE "VenteCarte" ALTER COLUMN "montantCatalogue" SET NOT NULL;

-- 3. Les colonnes d'une vente à carte unique disparaissent.
ALTER TABLE "VenteCarte" DROP CONSTRAINT "VenteCarte_carteId_fkey";
ALTER TABLE "VenteCarte" DROP COLUMN "carteId",
                         DROP COLUMN "carteNom",
                         DROP COLUMN "prixUnitaire",
                         DROP COLUMN "quantite";

ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_venteId_fkey"
    FOREIGN KEY ("venteId") REFERENCES "VenteCarte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_carteId_fkey"
    FOREIGN KEY ("carteId") REFERENCES "Carte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
