-- Refonte de l'espace admin, R-5 (docs/REFONTE-ADMIN.md § 5) : enchères de cartes et offres publiques.

-- CreateEnum
CREATE TYPE "StatutEnchere" AS ENUM ('OUVERTE', 'CONCLUE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Enchere" (
    "id" TEXT NOT NULL,
    "carteId" TEXT NOT NULL,
    "montantDepart" INTEGER NOT NULL,
    "pasMinimum" INTEGER NOT NULL,
    "dureeHeures" INTEGER NOT NULL,
    "tempsAdditionnelMin" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "finPrevue" TIMESTAMP(3) NOT NULL,
    "statut" "StatutEnchere" NOT NULL DEFAULT 'OUVERTE',
    "venteId" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enchere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffreEnchere" (
    "id" TEXT NOT NULL,
    "enchereId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "invalidee" BOOLEAN NOT NULL DEFAULT false,
    "motifEcart" TEXT,
    "ecarteeParId" TEXT,

    CONSTRAINT "OffreEnchere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enchere_venteId_key" ON "Enchere"("venteId");

-- CreateIndex
CREATE INDEX "Enchere_carteId_statut_idx" ON "Enchere"("carteId", "statut");

-- CreateIndex
CREATE INDEX "Enchere_statut_finPrevue_idx" ON "Enchere"("statut", "finPrevue");

-- CreateIndex
CREATE INDEX "OffreEnchere_enchereId_montant_idx" ON "OffreEnchere"("enchereId", "montant");

-- CreateIndex
CREATE INDEX "OffreEnchere_date_idx" ON "OffreEnchere"("date");

-- AddForeignKey
ALTER TABLE "Enchere" ADD CONSTRAINT "Enchere_carteId_fkey" FOREIGN KEY ("carteId") REFERENCES "Carte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enchere" ADD CONSTRAINT "Enchere_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "VenteCarte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enchere" ADD CONSTRAINT "Enchere_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreEnchere" ADD CONSTRAINT "OffreEnchere_enchereId_fkey" FOREIGN KEY ("enchereId") REFERENCES "Enchere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreEnchere" ADD CONSTRAINT "OffreEnchere_ecarteeParId_fkey" FOREIGN KEY ("ecarteeParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

