import { test, expect } from '@playwright/test'

test('la page d’accueil se charge', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})

// Modèle à suivre une fois le module Enseignants en place — un test e2e
// par flux CRITIQUE, pas un test par écran :
//
// test('créer un enseignant depuis le formulaire', async ({ page }) => {
//   await page.goto('/enseignants/nouveau')
//   await page.getByLabel('Matricule').fill('1134259T')
//   await page.getByLabel('Nom').fill('AKOA OWONA PLACIDE')
//   await page.getByRole('button', { name: 'Enregistrer' }).click()
//   await expect(page.getByText('Enseignant créé avec succès')).toBeVisible()
// })
