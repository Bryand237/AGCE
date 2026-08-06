/*
  Warnings:

  - Made the column `voie` on table `EchelonIndiciaire` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SelectionAvancement" DROP CONSTRAINT "SelectionAvancement_rapportId_fkey";

-- Ensure no NULLs remain before making 'voie' NOT NULL
UPDATE "EchelonIndiciaire" SET "voie" = 'AUCUNE' WHERE "voie" IS NULL;

-- AlterTable
ALTER TABLE "EchelonIndiciaire" ALTER COLUMN "voie" SET NOT NULL,
ALTER COLUMN "voie" SET DEFAULT 'AUCUNE';

-- CreateIndex
CREATE INDEX "Absence_statut_dateFin_idx" ON "Absence"("statut", "dateFin");

-- CreateIndex
CREATE INDEX "HistoriqueAvancement_sessionId_idx" ON "HistoriqueAvancement"("sessionId");

-- AddForeignKey
ALTER TABLE "SelectionAvancement" ADD CONSTRAINT "SelectionAvancement_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "SessionConseil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
