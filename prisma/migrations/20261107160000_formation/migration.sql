-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('NOUVELLE', 'TRAITEE');

-- AlterTable
ALTER TABLE "JournalAudit" ALTER COLUMN "compteId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DomainePermis" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DomainePermis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permis" (
    "id" TEXT NOT NULL,
    "domaineId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prerequis" TEXT NOT NULL DEFAULT '',
    "duree" TEXT NOT NULL DEFAULT '',
    "epreuves" TEXT NOT NULL DEFAULT '',
    "prix" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "Permis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeContact" (
    "id" TEXT NOT NULL,
    "nomRp" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "permisId" TEXT,
    "message" TEXT NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'NOUVELLE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeLe" TIMESTAMP(3),
    "traiteeParId" TEXT,

    CONSTRAINT "DemandeContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainePermis_nom_key" ON "DomainePermis"("nom");

-- CreateIndex
CREATE INDEX "Permis_domaineId_ordre_idx" ON "Permis"("domaineId", "ordre");

-- CreateIndex
CREATE INDEX "DemandeContact_statut_creeLe_idx" ON "DemandeContact"("statut", "creeLe");

-- AddForeignKey
ALTER TABLE "Permis" ADD CONSTRAINT "Permis_domaineId_fkey" FOREIGN KEY ("domaineId") REFERENCES "DomainePermis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeContact" ADD CONSTRAINT "DemandeContact_permisId_fkey" FOREIGN KEY ("permisId") REFERENCES "Permis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeContact" ADD CONSTRAINT "DemandeContact_traiteeParId_fkey" FOREIGN KEY ("traiteeParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
