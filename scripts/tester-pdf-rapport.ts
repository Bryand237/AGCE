// Script de test pour générer un PDF de rapport d'avancement
// Ce script crée des données de test (établissements, départements, enseignants, session, sélections)
// puis appelle l'endpoint de génération PDF pour vérifier le résultat.
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Création des données de test pour le PDF de rapport...')

  // Créer 2 établissements
  const etab1 = await prisma.etablissement.upsert({
    where: { abreviation: 'FALSH' },
    update: {},
    create: { nom: 'Faculté des Arts, Lettres et Sciences Humaines', abreviation: 'FALSH', type: 'FACULTE' },
  })

  const etab2 = await prisma.etablissement.upsert({
    where: { abreviation: 'FSJP' },
    update: {},
    create: { nom: 'Faculté des Sciences Juridiques et Politiques', abreviation: 'FSJP', type: 'FACULTE' },
  })

  // Créer départements
  const dept1 = await prisma.departement.upsert({
    where: { etablissementId_nom: { etablissementId: etab1.id, nom: "Département d'Histoire" } },
    update: {},
    create: { nom: "Département d'Histoire", abreviation: 'HIST', etablissementId: etab1.id },
  })

  const dept2 = await prisma.departement.upsert({
    where: { etablissementId_nom: { etablissementId: etab1.id, nom: 'Département de Sociologie' } },
    update: {},
    create: { nom: 'Département de Sociologie', abreviation: 'SOCIO', etablissementId: etab1.id },
  })

  const dept3 = await prisma.departement.upsert({
    where: { etablissementId_nom: { etablissementId: etab2.id, nom: 'Département de Droit Public' } },
    update: {},
    create: { nom: 'Département de Droit Public', abreviation: 'DRPUB', etablissementId: etab2.id },
  })

  // Récupérer des échelons indiciaires pour les positions
  const echelonCC2_6 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 6 },
  })
  const echelonCC1_1 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'CHARGE_DE_COURS', classe: 1, echelon: 1 },
  })
  const echelonMC2_3 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 3 },
  })
  const echelonMC2_4 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 4 },
  })
  const echelonProf2_2 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'PROFESSEUR', classe: 2, echelon: 2 },
  })
  const echelonProf2_3 = await prisma.echelonIndiciaire.findFirst({
    where: { grade: 'PROFESSEUR', classe: 2, echelon: 3 },
  })

  if (!echelonCC2_6 || !echelonCC1_1 || !echelonMC2_3 || !echelonMC2_4 || !echelonProf2_2 || !echelonProf2_3) {
    throw new Error('Échelons indiciaires non trouvés. Exécutez d abord: npx prisma db seed')
  }

  // Créer enseignants (différents grades dans FALSH, un grade dans FSJP)
  const ens1 = await prisma.enseignant.upsert({
    where: { matricule: '12345' },
    update: {},
    create: {
      matricule: '12345',
      nom: 'ABBA',
      prenom: 'Mohamed',
      sexe: 'M',
      dateNaissance: new Date('1975-05-15'),
      lieuNaissance: 'Ngaoundéré',
      grade: 'CHARGE_DE_COURS',
      diplomePlusEleve: 'Doctorat en Histoire',
      domaineRecherche: 'Histoire contemporaine',
      datePriseService: new Date('2010-09-01'),
      estResident: true,
      contratCollaboration: false,
      departementId: dept1.id,
      positionActuelleId: echelonCC2_6.id,
      dateEffetEchelon: new Date('2020-01-01'),
    },
  })

  const ens2 = await prisma.enseignant.upsert({
    where: { matricule: '12346' },
    update: {},
    create: {
      matricule: '12346',
      nom: 'BOUBA',
      prenom: 'Fatima',
      sexe: 'F',
      dateNaissance: new Date('1980-03-20'),
      lieuNaissance: 'Maroua',
      grade: 'CHARGE_DE_COURS',
      diplomePlusEleve: 'Doctorat en Sociologie',
      domaineRecherche: 'Sociologie rurale',
      datePriseService: new Date('2012-09-01'),
      estResident: true,
      contratCollaboration: false,
      departementId: dept2.id,
      positionActuelleId: echelonCC2_6.id,
      dateEffetEchelon: new Date('2021-01-01'),
    },
  })

  const ens3 = await prisma.enseignant.upsert({
    where: { matricule: '12347' },
    update: {},
    create: {
      matricule: '12347',
      nom: 'DJIROU',
      prenom: 'Pierre',
      sexe: 'M',
      dateNaissance: new Date('1970-08-10'),
      lieuNaissance: 'Douala',
      grade: 'MAITRE_DE_CONFERENCES',
      diplomePlusEleve: 'HDR en Histoire',
      domaineRecherche: 'Histoire coloniale',
      datePriseService: new Date('2005-09-01'),
      estResident: true,
      contratCollaboration: false,
      departementId: dept1.id,
      positionActuelleId: echelonMC2_3.id,
      dateEffetEchelon: new Date('2018-01-01'),
    },
  })

  const ens4 = await prisma.enseignant.upsert({
    where: { matricule: '12348' },
    update: {},
    create: {
      matricule: '12348',
      nom: 'EL HADJ',
      prenom: 'Aïcha',
      sexe: 'F',
      dateNaissance: new Date('1978-11-25'),
      lieuNaissance: 'Garoua',
      grade: 'MAITRE_DE_CONFERENCES',
      diplomePlusEleve: 'HDR en Sociologie',
      domaineRecherche: 'Sociologie urbaine',
      datePriseService: new Date('2008-09-01'),
      estResident: true,
      contratCollaboration: false,
      departementId: dept2.id,
      positionActuelleId: echelonMC2_3.id,
      dateEffetEchelon: new Date('2019-01-01'),
    },
  })

  const ens5 = await prisma.enseignant.upsert({
    where: { matricule: '12349' },
    update: {},
    create: {
      matricule: '12349',
      nom: 'FOUDA',
      prenom: 'Jean',
      sexe: 'M',
      dateNaissance: new Date('1968-02-14'),
      lieuNaissance: 'Yaoundé',
      grade: 'PROFESSEUR',
      diplomePlusEleve: 'HDR en Droit Public',
      domaineRecherche: 'Droit constitutionnel',
      datePriseService: new Date('2000-09-01'),
      estResident: true,
      contratCollaboration: false,
      departementId: dept3.id,
      positionActuelleId: echelonProf2_2.id,
      dateEffetEchelon: new Date('2015-01-01'),
    },
  })

  // Créer une session de conseil
  const session = await prisma.sessionConseil.upsert({
    where: { id: 'test-session-id' },
    update: {},
    create: {
      id: 'test-session-id',
      numero: '54',
      periodeDebut: new Date('2024-01-01'),
      periodeFin: new Date('2024-06-30'),
      statut: 'BROUILLON',
      referenceLoiFinances: 'Loi de finances 2024',
      referenceCirculaire: 'Circulaire 001/2024',
      dateSessionCU: new Date('2024-07-15'),
      dateSessionCA: new Date('2024-07-20'),
    },
  })

  // Créer les sélections d'avancement
  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId: session.id, enseignantId: ens1.id } },
    update: {},
    create: {
      rapportId: session.id,
      enseignantId: ens1.id,
      positionProposeeId: echelonCC1_1.id,
    },
  })

  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId: session.id, enseignantId: ens2.id } },
    update: {},
    create: {
      rapportId: session.id,
      enseignantId: ens2.id,
      positionProposeeId: echelonCC1_1.id,
    },
  })

  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId: session.id, enseignantId: ens3.id } },
    update: {},
    create: {
      rapportId: session.id,
      enseignantId: ens3.id,
      positionProposeeId: echelonMC2_4.id,
    },
  })

  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId: session.id, enseignantId: ens4.id } },
    update: {},
    create: {
      rapportId: session.id,
      enseignantId: ens4.id,
      positionProposeeId: echelonMC2_4.id,
    },
  })

  await prisma.selectionAvancement.upsert({
    where: { rapportId_enseignantId: { rapportId: session.id, enseignantId: ens5.id } },
    update: {},
    create: {
      rapportId: session.id,
      enseignantId: ens5.id,
      positionProposeeId: echelonProf2_3.id,
    },
  })

  console.log('✓ Données de test créées avec succès')
  console.log(`  - Session ID: ${session.id}`)
  console.log(`  - URL du PDF: http://localhost:3000/avancements/${session.id}/rapport-pdf`)
  console.log('\nVous pouvez maintenant tester la génération du PDF en accédant à cette URL.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
