import { test, expect } from '@playwright/test'
import { creerEtablissementTest, creerDepartementTest, creerEnseignantTest, seConnecter } from './helpers'

test.describe('Avancements', () => {
  test.beforeAll(async () => {
    const etab = await creerEtablissementTest()
    const dep = await creerDepartementTest(etab.id)
    await creerEnseignantTest(dep.id, '0001TESTPW')
  })

  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création du rapport, sélection automatique, validation, puis génération de la décision', async ({ page }) => {
    await page.goto('/avancements/nouveau')
    await page.getByLabel(/édition/i).fill('99ème')
    await page.getByRole('button', { name: /générer la sélection/i }).click()

    // Redirigé vers la page du rapport nouvellement créé
    await expect(page.getByRole('heading', { name: /rapport 99ème/i })).toBeVisible()

    await page.getByLabel(/date de validation/i).first().fill('2026-07-15')
    await page.getByLabel(/auteur de la validation/i).first().fill('Le Recteur')
    await page.getByRole('button', { name: /^valider$/i }).click()

    await expect(page.getByText(/validé le/i)).toBeVisible()

    // Ouvre le premier avancement listé et génère sa décision
    await page.getByRole('link', { name: /mbarga|dupont/i }).first().click();
    await page.getByRole('button', { name: /générer le brouillon/i }).click();
    await expect(page.getByText(/télécharger le brouillon/i)).toBeVisible();

    await page.getByLabel(/numéro de décision/i).fill('0000456')
    await page.getByLabel(/date de validation/i).fill('2026-07-16')
    await page.getByLabel(/auteur de la validation/i).fill('Le Recteur')
    await page.getByRole('button', { name: /marquer signée/i }).click()

    await expect(page.getByText(/décision n°0000456/i)).toBeVisible()
  })

  test('rejette un rapport avec un motif, puis le laisse modifiable', async ({ page }) => {
    await page.goto('/avancements/nouveau')
    await page.getByLabel(/édition/i).fill('98ème')
    await page.getByRole('button', { name: /générer la sélection/i }).click()

    await page.getByLabel(/motif/i).fill('Erreur de période à corriger')
    await page.getByRole('button', { name: /^rejeter$/i }).click()

    await expect(page.getByText(/rejeté précédemment/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /^valider$/i })).toBeVisible()
  })
})