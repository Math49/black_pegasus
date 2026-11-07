-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('VALIDEE', 'ANNULEE');

-- AlterTable
ALTER TABLE "Mouvement" ADD COLUMN     "venteCarteId" TEXT;

-- CreateTable
CREATE TABLE "CategorieCarte" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategorieCarte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carte" (
    "id" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prix" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "photo" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "Carte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteCarte" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "carteId" TEXT NOT NULL,
    "carteNom" TEXT NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "statut" "StatutVente" NOT NULL DEFAULT 'VALIDEE',
    "saisieParId" TEXT NOT NULL,

    CONSTRAINT "VenteCarte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategorieCarte_nom_key" ON "CategorieCarte"("nom");

-- CreateIndex
CREATE INDEX "Carte_categorieId_ordre_idx" ON "Carte"("categorieId", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "VenteCarte_numero_key" ON "VenteCarte"("numero");

-- CreateIndex
CREATE INDEX "VenteCarte_date_idx" ON "VenteCarte"("date");

-- CreateIndex
CREATE INDEX "Mouvement_venteCarteId_idx" ON "Mouvement"("venteCarteId");

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_venteCarteId_fkey" FOREIGN KEY ("venteCarteId") REFERENCES "VenteCarte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carte" ADD CONSTRAINT "Carte_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "CategorieCarte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteCarte" ADD CONSTRAINT "VenteCarte_carteId_fkey" FOREIGN KEY ("carteId") REFERENCES "Carte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteCarte" ADD CONSTRAINT "VenteCarte_saisieParId_fkey" FOREIGN KEY ("saisieParId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Le stock ne descend jamais sous zéro, même en cas d'écriture concurrente.
ALTER TABLE "Carte" ADD CONSTRAINT "Carte_stock_positif" CHECK ("stock" >= 0);
