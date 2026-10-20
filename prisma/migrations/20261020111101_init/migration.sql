-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('BATEAU', 'AVION', 'HELICOPTERE');

-- CreateEnum
CREATE TYPE "StatutExemplaire" AS ENUM ('DISPONIBLE', 'LOUE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "StatutContrat" AS ENUM ('EN_COURS', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TarifApplique" AS ENUM ('HORAIRE', 'JOURNALIER');

-- CreateEnum
CREATE TYPE "Sens" AS ENUM ('ENTREE', 'SORTIE');

-- CreateEnum
CREATE TYPE "CategorieMouvement" AS ENUM ('LOCATION', 'PENALITE', 'CAUTION_ENCAISSEE', 'CAUTION_RENDUE', 'ACHAT_VEHICULE', 'ENTRETIEN', 'IMPOTS', 'APPORT', 'DIVERS');

-- CreateEnum
CREATE TYPE "StatutSemaine" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTIONNAIRE');

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeVehicule" NOT NULL,
    "categorieId" TEXT NOT NULL,
    "places" INTEGER NOT NULL,
    "contenanceKg" INTEGER NOT NULL,
    "prixHeure" INTEGER NOT NULL,
    "prixJour" INTEGER NOT NULL,
    "caution" INTEGER NOT NULL,
    "photo" TEXT,
    "galerie" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "visibleSurSite" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,
    "modifieParId" TEXT,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exemplaire" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "statut" "StatutExemplaire" NOT NULL DEFAULT 'DISPONIBLE',
    "note" TEXT,

    CONSTRAINT "Exemplaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL,
    "exemplaireId" TEXT NOT NULL,
    "vehiculeNom" TEXT NOT NULL,
    "prixHeure" INTEGER NOT NULL,
    "prixJour" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "finPrevue" TIMESTAMP(3) NOT NULL,
    "heuresFacturees" INTEGER NOT NULL,
    "tarifApplique" "TarifApplique" NOT NULL,
    "montantLocation" INTEGER NOT NULL,
    "caution" INTEGER NOT NULL,
    "statut" "StatutContrat" NOT NULL DEFAULT 'EN_COURS',
    "retourReel" TIMESTAMP(3),
    "retardMinutes" INTEGER,
    "penaliteRetard" INTEGER,
    "penaliteDegats" INTEGER,
    "degats" JSONB,
    "cautionRestituee" INTEGER,
    "noteEtatDesLieux" TEXT,
    "pdf" TEXT,
    "creeParId" TEXT NOT NULL,
    "clotureParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mouvement" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "semaineId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sens" "Sens" NOT NULL,
    "categorie" "CategorieMouvement" NOT NULL,
    "montant" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "contratId" TEXT,
    "justificatif" TEXT,
    "justificatifNumero" TEXT,
    "automatique" BOOLEAN NOT NULL DEFAULT false,
    "annuleMouvementId" TEXT,
    "saisiParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mouvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semaine" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutSemaine" NOT NULL DEFAULT 'OUVERTE',
    "soldeOuverture" INTEGER NOT NULL,
    "soldeCloture" INTEGER,
    "clotureeLe" TIMESTAMP(3),
    "clotureeParId" TEXT,
    "declarationPdf" TEXT,
    "declarationSha256" TEXT,
    "compteurOperations" INTEGER NOT NULL DEFAULT 0,
    "compteurJustificatifs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Semaine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compte" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "pseudo" TEXT NOT NULL,
    "nomAffiche" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'GESTIONNAIRE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ajouteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ajouteParId" TEXT,
    "derniereConnexion" TIMESTAMP(3),

    CONSTRAINT "Compte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compteur" (
    "cle" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Compteur_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "Parametres" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nomEntreprise" TEXT NOT NULL DEFAULT 'Black Pégasus – American Transports',
    "telephoneAgence" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,
    "fuseauServeur" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "numeroImmatriculationEntreprise" TEXT NOT NULL,
    "toleranceRetardMin" INTEGER NOT NULL DEFAULT 15,
    "majorationRetard" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "seuilDefautRestitutionMin" INTEGER NOT NULL DEFAULT 180,
    "penalitesSurCaution" BOOLEAN NOT NULL DEFAULT false,
    "ouvertureClotureHeuresAvantFin" INTEGER NOT NULL DEFAULT 24,
    "forfaitsDegats" JSONB NOT NULL,
    "textesSite" JSONB NOT NULL,
    "reglement" JSONB NOT NULL,

    CONSTRAINT "Parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compteId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_type_nom_key" ON "Categorie"("type", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_slug_key" ON "Vehicule"("slug");

-- CreateIndex
CREATE INDEX "Vehicule_type_idx" ON "Vehicule"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Exemplaire_immatriculation_key" ON "Exemplaire"("immatriculation");

-- CreateIndex
CREATE INDEX "Exemplaire_vehiculeId_idx" ON "Exemplaire"("vehiculeId");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_numero_key" ON "Contrat"("numero");

-- CreateIndex
CREATE INDEX "Contrat_statut_finPrevue_idx" ON "Contrat"("statut", "finPrevue");

-- CreateIndex
CREATE INDEX "Contrat_exemplaireId_idx" ON "Contrat"("exemplaireId");

-- CreateIndex
CREATE UNIQUE INDEX "Mouvement_numero_key" ON "Mouvement"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Mouvement_annuleMouvementId_key" ON "Mouvement"("annuleMouvementId");

-- CreateIndex
CREATE INDEX "Mouvement_semaineId_date_idx" ON "Mouvement"("semaineId", "date");

-- CreateIndex
CREATE INDEX "Mouvement_contratId_idx" ON "Mouvement"("contratId");

-- CreateIndex
CREATE UNIQUE INDEX "Semaine_annee_numero_key" ON "Semaine"("annee", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Compte_discordId_key" ON "Compte"("discordId");

-- CreateIndex
CREATE INDEX "JournalAudit_date_idx" ON "JournalAudit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicule" ADD CONSTRAINT "Vehicule_modifieParId_fkey" FOREIGN KEY ("modifieParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exemplaire" ADD CONSTRAINT "Exemplaire_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_exemplaireId_fkey" FOREIGN KEY ("exemplaireId") REFERENCES "Exemplaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_clotureParId_fkey" FOREIGN KEY ("clotureParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_semaineId_fkey" FOREIGN KEY ("semaineId") REFERENCES "Semaine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_contratId_fkey" FOREIGN KEY ("contratId") REFERENCES "Contrat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_annuleMouvementId_fkey" FOREIGN KEY ("annuleMouvementId") REFERENCES "Mouvement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semaine" ADD CONSTRAINT "Semaine_clotureeParId_fkey" FOREIGN KEY ("clotureeParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compte" ADD CONSTRAINT "Compte_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "Compte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "Compte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
