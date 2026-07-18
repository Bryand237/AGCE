-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('PROFESSEUR', 'MAITRE_DE_CONFERENCES', 'CHARGE_DE_COURS', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "StatutEnseignant" AS ENUM ('ACTIF', 'TRANSFERE', 'RETRAITE');

-- CreateEnum
CREATE TYPE "TypeAvancement" AS ENUM ('ANCIENNETE', 'CHOIX', 'GRAND_CHOIX');

-- CreateEnum
CREATE TYPE "TypeAbsence" AS ENUM ('MISSION', 'CONGE_MATERNITE', 'CONGE_MALADIE', 'CONGE_ADMINISTRATIF', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeEtablissement" AS ENUM ('ECOLE', 'FACULTE');

-- CreateEnum
CREATE TYPE "StatutRapport" AS ENUM ('BROUILLON', 'VALIDE');

-- CreateEnum
CREATE TYPE "StatutDecision" AS ENUM ('EN_ATTENTE', 'VALIDEE');

-- CreateEnum
CREATE TYPE "StatutAbsence" AS ENUM ('EN_ATTENTE', 'EN_PERIODE', 'DEPASSE', 'TERMINE');

-- CreateEnum
CREATE TYPE "StatutAttestation" AS ENUM ('EN_ATTENTE', 'VALIDEE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nomUtilisateur" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "abreviation" TEXT NOT NULL,
    "type" "TypeEtablissement" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "abreviation" TEXT NOT NULL,
    "etablissementId" TEXT NOT NULL,

    CONSTRAINT "Departement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartementOrigine" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "DepartementOrigine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EchelonIndiciaire" (
    "id" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "voie" TEXT,
    "sousCategorie" TEXT,
    "classe" INTEGER,
    "echelon" INTEGER,
    "indice" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "EchelonIndiciaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enseignant" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "lieuNaissance" TEXT NOT NULL,
    "statut" "StatutEnseignant" NOT NULL DEFAULT 'ACTIF',
    "dateFinService" TIMESTAMP(3),
    "grade" "Grade" NOT NULL,
    "diplomePlusEleve" TEXT,
    "domaineRecherche" TEXT,
    "datePriseService" TIMESTAMP(3) NOT NULL,
    "estResident" BOOLEAN NOT NULL DEFAULT true,
    "contratCollaboration" BOOLEAN NOT NULL DEFAULT false,
    "posteResponsabilite" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "departementId" TEXT NOT NULL,
    "departementOrigineId" TEXT,
    "positionActuelleId" TEXT NOT NULL,
    "dateEffetEchelon" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enseignant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionConseil" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutRapport" NOT NULL DEFAULT 'BROUILLON',
    "motifRejet" TEXT,
    "dateSessionCU" TIMESTAMP(3),
    "dateSessionCA" TIMESTAMP(3),
    "referenceLoiFinances" TEXT,
    "referenceCirculaire" TEXT,
    "dateSignatureDecisions" TIMESTAMP(3),
    "dateValidation" TIMESTAMP(3),
    "auteurValidation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionConseil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionAvancement" (
    "id" TEXT NOT NULL,
    "rapportId" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "positionProposeeId" TEXT NOT NULL,

    CONSTRAINT "SelectionAvancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueAvancement" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "sessionId" TEXT,
    "anciennePositionId" TEXT NOT NULL,
    "dateAncienEffet" TIMESTAMP(3) NOT NULL,
    "nouvellePositionId" TEXT NOT NULL,
    "dateNouvelEffet" TIMESTAMP(3) NOT NULL,
    "auteurValidationDecision" TEXT,
    "typeAvancement" "TypeAvancement",
    "numeroDecision" TEXT,
    "avisCU" BOOLEAN NOT NULL DEFAULT false,
    "avisCA" BOOLEAN NOT NULL DEFAULT false,
    "observations" TEXT,
    "decisionGeneree" BYTEA,
    "statutDecision" "StatutDecision",
    "dateValidationDecision" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueAvancement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "type" "TypeAbsence" NOT NULL,
    "statut" "StatutAbsence" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "dateRetour" TIMESTAMP(3),
    "dateValidation" TIMESTAMP(3),
    "auteurValidation" TEXT,
    "referenceCorrespondance" TEXT,
    "dateCorrespondance" TIMESTAMP(3),
    "dateDemandeInteressee" TIMESTAMP(3),
    "motif" TEXT,
    "numeroDecision" TEXT,
    "decisionGeneree" BYTEA,
    "statutAttestation" "StatutAttestation",
    "dateValidationAttestation" TIMESTAMP(3),
    "auteurValidationAttestation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_nomUtilisateur_key" ON "Utilisateur"("nomUtilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Etablissement_abreviation_key" ON "Etablissement"("abreviation");

-- CreateIndex
CREATE UNIQUE INDEX "Departement_etablissementId_nom_key" ON "Departement"("etablissementId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Departement_etablissementId_abreviation_key" ON "Departement"("etablissementId", "abreviation");

-- CreateIndex
CREATE UNIQUE INDEX "Region_nom_key" ON "Region"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "DepartementOrigine_nom_key" ON "DepartementOrigine"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "EchelonIndiciaire_grade_voie_ordre_key" ON "EchelonIndiciaire"("grade", "voie", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "Enseignant_matricule_key" ON "Enseignant"("matricule");

-- CreateIndex
CREATE INDEX "Enseignant_departementId_idx" ON "Enseignant"("departementId");

-- CreateIndex
CREATE INDEX "Enseignant_statut_idx" ON "Enseignant"("statut");

-- CreateIndex
CREATE INDEX "Enseignant_grade_idx" ON "Enseignant"("grade");

-- CreateIndex
CREATE INDEX "Enseignant_nom_prenom_idx" ON "Enseignant"("nom", "prenom");

-- CreateIndex
CREATE INDEX "SessionConseil_statut_idx" ON "SessionConseil"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionAvancement_rapportId_enseignantId_key" ON "SelectionAvancement"("rapportId", "enseignantId");

-- CreateIndex
CREATE INDEX "HistoriqueAvancement_enseignantId_dateNouvelEffet_idx" ON "HistoriqueAvancement"("enseignantId", "dateNouvelEffet");

-- CreateIndex
CREATE INDEX "Absence_enseignantId_dateDebut_idx" ON "Absence"("enseignantId", "dateDebut");

-- CreateIndex
CREATE INDEX "Absence_enseignantId_statut_idx" ON "Absence"("enseignantId", "statut");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departement" ADD CONSTRAINT "Departement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartementOrigine" ADD CONSTRAINT "DepartementOrigine_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_departementOrigineId_fkey" FOREIGN KEY ("departementOrigineId") REFERENCES "DepartementOrigine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_positionActuelleId_fkey" FOREIGN KEY ("positionActuelleId") REFERENCES "EchelonIndiciaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionAvancement" ADD CONSTRAINT "SelectionAvancement_rapportId_fkey" FOREIGN KEY ("rapportId") REFERENCES "SessionConseil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionAvancement" ADD CONSTRAINT "SelectionAvancement_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionAvancement" ADD CONSTRAINT "SelectionAvancement_positionProposeeId_fkey" FOREIGN KEY ("positionProposeeId") REFERENCES "EchelonIndiciaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAvancement" ADD CONSTRAINT "HistoriqueAvancement_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAvancement" ADD CONSTRAINT "HistoriqueAvancement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionConseil"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAvancement" ADD CONSTRAINT "HistoriqueAvancement_anciennePositionId_fkey" FOREIGN KEY ("anciennePositionId") REFERENCES "EchelonIndiciaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAvancement" ADD CONSTRAINT "HistoriqueAvancement_nouvellePositionId_fkey" FOREIGN KEY ("nouvellePositionId") REFERENCES "EchelonIndiciaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
