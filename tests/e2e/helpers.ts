import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// ATTENTION : ces tests ÉCRIVENT dans la base désignée par DATABASE_URL (enseignants, absences,
// rapports de test). Ne jamais la faire pointer vers la base du propriétaire : utiliser une base
// jetable (celle de la CI) ou une copie restaurée depuis une sauvegarde. Ils ne se rejouent pas
// deux fois sur la même base (matricules, abréviations et éditions de test uniques).
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

/**
 * Confirme la fenêtre « Êtes-vous sûr ? » (rôle `alertdialog`) qui s'ouvre avant une action qui
 * ne se défait pas : signer une attestation ou une décision, enregistrer un retour, valider un
 * rapport. Le bouton du formulaire n'envoie plus directement : il ouvre la fenêtre, et c'est son
 * bouton de confirmation (`libelle`) qui envoie. On le cherche DANS la fenêtre : le formulaire
 * derrière porte parfois le même libellé (« Marquer signée »).
 */
export async function confirmer(page: Page, libelle: RegExp) {
  const fenetre = page.getByRole('alertdialog')
  await fenetre.getByRole('button', { name: libelle }).click()
  await expect(fenetre).toBeHidden()
}
