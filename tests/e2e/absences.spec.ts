import { test, expect } from '@playwright/test'
import { creerEtablissementTest, creerDepartementTest, creerEnseignantTest, seConnecter } from './helpers'

test.describe('Absences', () => {
  test.beforeAll(async () => {
    const etab = await creerEtablissementTest()
    const dep = await creerDepartementTest(etab.id)
    await creerEnseignantTest(dep.id, '0002TESTPW')
  })

  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création d’un congé de maternité, validation, puis retour', async ({ page }) => {
    await page.goto('/absences/nouveau')
    await page.getByLabel(/matricule/i).fill('0002TESTPW')
    await page.getByLabel(/type d.absence/i).selectOption('CONGE_MATERNITE')
    await page.getByLabel(/date de début/i).fill('2026-04-14')
    await page.getByRole('button', { name: /créer l.absence/i }).click()

    await expect(page.getByText(/congé de maternité/i)).toBeVisible()

    await page.getByLabel(/date de validation/i).fill('2026-04-20')
    await page.getByLabel(/auteur de la validation/i).fill('Le Recteur')
    await page.getByRole('button', { name: /^valider$/i }).click()

    await page.getByLabel(/date de retour/i).fill('2026-07-22')
    await page.getByRole('button', { name: /marquer terminé/i }).click()
    await expect(page.getByText(/retour enregistré le/i)).toBeVisible()
  })

  test('refuse une deuxième absence pour un enseignant déjà en cours', async ({ page }) => {
    // Recrée un enseignant frais, dédié à ce test, sans absence terminée au préalable
    await page.goto('/absences/nouveau')
    await page.getByLabel(/matricule/i).fill('0002TESTPW')
    await page.getByLabel(/type d.absence/i).selectOption('CONGE_MALADIE')
    await page.getByLabel(/date de début/i).fill('2026-08-01')
    await page.getByLabel(/date de fin/i).fill('2026-08-10')
    await page.getByRole('button', { name: /créer l.absence/i }).click()

    await page.getByLabel(/matricule/i).fill('0002TESTPW')
    await page.getByLabel(/type d.absence/i).selectOption('MISSION')
    await page.getByLabel(/date de début/i).fill('2026-09-01')
    await page.getByLabel(/date de fin/i).fill('2026-09-05')
    await page.getByRole('button', { name: /créer l.absence/i }).click()

    await expect(page.getByText(/a déjà une absence en cours ou en attente/i)).toBeVisible()
  })
})