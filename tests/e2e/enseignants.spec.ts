import { test, expect } from '@playwright/test'
import { creerEtablissementTest, creerDepartementTest, seConnecter } from './helpers'

test.describe('Enseignants', () => {
  test.beforeAll(async () => {
    const etab = await creerEtablissementTest()
    await creerDepartementTest(etab.id)
  })

  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création avec sélection en cascade établissement → département et grade → position', async ({
    page,
  }) => {
    await page.goto('/enseignants/nouveau')

    await page.getByLabel(/matricule/i).fill('0000TESTPW')
    await page.getByLabel(/^nom$/i).fill('MBARGA')
    await page.getByLabel(/prénom/i).fill('Alice')
    await page.getByLabel(/sexe/i).selectOption('F')
    await page.getByLabel(/date de naissance/i).fill('1988-03-20')
    await page.getByLabel(/lieu de naissance/i).fill('Yaoundé')
    await page.getByLabel(/date de prise de service/i).fill('2018-09-01')
    await page.getByLabel(/date d'effet/i).fill('2018-09-01')

    await page.getByLabel(/établissement/i).selectOption({ label: 'Faculté de Test' })
    await page.getByLabel(/département/i).selectOption({ label: 'Département de Test' })

    await page.getByLabel(/^grade$/i).selectOption('CHARGE_DE_COURS')
    await page.getByLabel(/position|échelon/i).selectOption({ index: 1 })

    await page.getByRole('button', { name: /enregistrer|créer/i }).click()

    await expect(page.getByText('0000TESTPW')).toBeVisible()
  })

  test('recherche par matricule et affichage du détail avec historique', async ({ page }) => {
    await page.goto('/enseignants')
    await page.getByPlaceholder(/rechercher/i).fill('0000TESTPW')
    await page.getByRole('button', { name: /rechercher/i }).click()
    await page.getByRole('link', { name: /mbarga/i }).click()

    await expect(page.getByRole('heading', { name: /mbarga/i })).toBeVisible()
    await expect(page.getByText(/historique de carrière/i)).toBeVisible()
  })
})
