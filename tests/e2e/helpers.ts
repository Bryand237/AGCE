import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const prismaTest = new PrismaClient({ adapter: new PrismaPg(pool) })

/** Identifiants admin — alignés sur CI (.github/workflows/ci.yml) ou .env local. */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'test_admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'test_password'

export async function seConnecter(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel(/nom d'utilisateur/i).fill(ADMIN_USERNAME)
  await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /connexion/i }).click()
  await expect(page).not.toHaveURL(/\/connexion/)
}

export async function creerEtablissementTest() {
  return prismaTest.etablissement.upsert({
    where: { abreviation: 'TEST' },
    update: {},
    create: { nom: 'Faculté de Test', abreviation: 'TEST', type: 'FACULTE' },
  })
}

export async function creerDepartementTest(etablissementId: string) {
  return prismaTest.departement.upsert({
    where: { etablissementId_nom: { etablissementId, nom: 'Département de Test' } },
    update: {},
    create: { nom: 'Département de Test', abreviation: 'DTEST', etablissementId },
  })
}

export async function creerEnseignantTest(departementId: string, matricule: string) {
  const position = await prismaTest.echelonIndiciaire.findFirstOrThrow({
    where: { grade: 'CHARGE_DE_COURS', ordre: 3 },
  })
  return prismaTest.enseignant.upsert({
    where: { matricule },
    update: {},
    create: {
      matricule,
      nom: 'DUPONT',
      prenom: 'Jean',
      sexe: 'M',
      dateNaissance: new Date('1985-05-15'),
      lieuNaissance: 'Ngaoundéré',
      datePriseService: new Date('2015-09-01'),
      grade: 'CHARGE_DE_COURS',
      departementId,
      positionActuelleId: position.id,
      dateEffetEchelon: new Date('2023-11-26'),
    },
  })
}