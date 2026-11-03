import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  creerEtablissementTest,
  creerDepartementTest,
  creerEnseignantTest,
  seConnecter,
} from './helpers'

// Les listes déroulantes se pilotent par leur identifiant ou leur nom, pas par leur libellé :
// le texte d'un `<label>` qui enveloppe un `<select>` contient aussi celui de toutes ses options,
// et « établissement » se retrouvait dans le libellé « Département d'affectation » (« Choisir
// d'abord un établissement »).
async function remplirFormulaire(
  page: Page,
  matricule: string,
  affectation: { etablissementId: string; departementId: string }
) {
  await page.getByLabel(/matricule/i).fill(matricule)
  await page.getByLabel(/^nom$/i).fill('MBARGA')
  await page.getByLabel(/prénom/i).fill('Alice')
  await page.locator('select[name="sexe"]').selectOption('F')
  await page.getByLabel(/date de naissance/i).fill('1988-03-20')
  await page.getByLabel(/lieu de naissance/i).fill('Yaoundé')
  await page.getByLabel(/date de prise de service/i).fill('2018-09-01')
  await page.getByLabel(/date d'effet/i).fill('2018-09-01')

  await page.locator('#etablissement').selectOption(affectation.etablissementId)
  await page.locator('#departementId').selectOption(affectation.departementId)
  await page.locator('#grade').selectOption('CHARGE_DE_COURS')
  // La première position de la grille du grade choisi (la liste est vide tant qu'il manque le grade).
  await page.locator('#positionActuelleId').selectOption({ index: 1 })
}

test.describe('Enseignants', () => {
  let affectation: { etablissementId: string; departementId: string }

  test.beforeAll(async () => {
    const etab = await creerEtablissementTest()
    const dep = await creerDepartementTest(etab.id)
    affectation = { etablissementId: etab.id, departementId: dep.id }
  })

  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création avec sélection en cascade établissement → département et grade → position', async ({
    page,
  }) => {
    await page.goto('/enseignants/nouveau')
    await remplirFormulaire(page, '0000TESTPW', affectation)

    await page.getByRole('button', { name: /enregistrer l'enseignant/i }).click()

    // L'action redirige vers la liste (avec un message), où le matricule s'affiche.
    await expect(page.getByText('0000TESTPW')).toBeVisible()
  })

  test('un refus du serveur (matricule déjà utilisé) conserve toute la saisie', async ({
    page,
  }) => {
    await creerEnseignantTest(affectation.departementId, '0000TESTDUP')

    await page.goto('/enseignants/nouveau')
    await remplirFormulaire(page, '0000TESTDUP', affectation)

    await page.getByRole('button', { name: /enregistrer l'enseignant/i }).click()

    // Le doublon est annoncé pour ce qu'il est, et rien de ce qui a été saisi n'est effacé.
    await expect(page.getByText('Ce matricule existe déjà.')).toBeVisible()
    await expect(page.getByLabel(/matricule/i)).toHaveValue('0000TESTDUP')
    await expect(page.getByLabel(/^nom$/i)).toHaveValue('MBARGA')
    await expect(page.locator('select[name="sexe"]')).toHaveValue('F')
    await expect(page.locator('#etablissement')).toHaveValue(affectation.etablissementId)
    await expect(page.locator('#grade')).toHaveValue('CHARGE_DE_COURS')
  })

  test('recherche par matricule et affichage du détail avec historique', async ({ page }) => {
    // Un enseignant créé pour ce test : il ne dépend pas de l'ordre des autres.
    await creerEnseignantTest(affectation.departementId, '0000TESTREC')

    await page.goto('/enseignants')
    await page.getByPlaceholder(/rechercher/i).fill('0000TESTREC')
    await page.getByRole('button', { name: /rechercher/i }).click()
    await page.getByRole('link', { name: /dupont/i }).click()

    await expect(page.getByRole('heading', { name: /dupont/i })).toBeVisible()
    await expect(page.getByText(/historique de carrière/i)).toBeVisible()
  })
})
