import { test, expect } from '@playwright/test'
import { seConnecter } from './helpers'

test.describe('Établissements', () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création, apparition dans la liste, puis recherche', async ({ page }) => {
    await page.goto('/etablissements/nouveau')
    await page.getByLabel(/nom/i).first().fill('École Test Playwright')
    await page.getByLabel(/abréviation/i).fill('ETPW')
    await page.getByLabel(/type/i).selectOption('ECOLE')
    await page.getByRole('button', { name: /enregistrer|créer/i }).click()

    await expect(page).toHaveURL('/etablissements')
    await page.getByPlaceholder(/rechercher/i).fill('ETPW')
    await page.getByRole('button', { name: /rechercher/i }).click()
    await expect(page.getByText('ETPW')).toBeVisible()
  })

  test('affiche le détail après un clic depuis la liste', async ({ page }) => {
    await page.goto('/etablissements')
    await page.getByRole('link', { name: /etpw/i }).first().click()
    await expect(page.getByRole('heading', { name: /etpw|école test/i })).toBeVisible()
  })
})