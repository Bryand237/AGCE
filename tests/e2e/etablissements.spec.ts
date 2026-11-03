import { test, expect } from '@playwright/test'
import { creerEtablissementTest, seConnecter } from './helpers'

test.describe('Établissements', () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création, apparition dans la liste, puis recherche', async ({ page }) => {
    await page.goto('/etablissements/nouveau')
    await page.getByLabel(/nom/i).first().fill('École Test Playwright')
    await page.getByLabel(/abréviation/i).fill('ETPW')
    await page.locator('select[name="type"]').selectOption('ECOLE')
    await page.getByRole('button', { name: /enregistrer|créer/i }).click()

    // L'action redirige avec un message (?msg=…) : la notification s'affiche, puis l'adresse est nettoyée.
    await expect(page.getByText('Établissement ajouté.')).toBeVisible()
    await expect(page).toHaveURL('/etablissements')
    await page.getByPlaceholder(/rechercher/i).fill('ETPW')
    await page.getByRole('button', { name: /rechercher/i }).click()
    await expect(page.getByText('ETPW')).toBeVisible()
  })

  test('affiche le détail après un clic depuis la liste', async ({ page }) => {
    // Un établissement créé pour ce test : il ne dépend pas de l'ordre des autres.
    await creerEtablissementTest()

    await page.goto('/etablissements')
    await page.getByPlaceholder(/rechercher/i).fill('Faculté de Test')
    await page.getByRole('button', { name: /rechercher/i }).click()
    await page
      .getByRole('link', { name: /faculté de test/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: /faculté de test/i })).toBeVisible()
  })
})
