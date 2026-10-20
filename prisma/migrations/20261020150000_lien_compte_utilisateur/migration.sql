-- AlterTable
ALTER TABLE "Compte" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Compte_userId_key" ON "Compte"("userId");

-- AddForeignKey
ALTER TABLE "Compte" ADD CONSTRAINT "Compte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

