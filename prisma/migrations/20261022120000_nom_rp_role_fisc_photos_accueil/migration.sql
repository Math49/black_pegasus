-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FISC';

-- AlterTable
ALTER TABLE "Compte" ADD COLUMN     "nomRp" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Parametres" ADD COLUMN     "photosAccueil" JSONB NOT NULL DEFAULT '{}';

