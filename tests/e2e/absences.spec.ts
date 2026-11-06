import { test, expect } from '@playwright/test'
import {
  confirmer,
  creerEtablissementTest,
  creerDepartementTest,
  creerEnseignantTest,
  seConnecter,
} from './helpers'

// Un enseignant par test : les tests d'un même fichier s'exécutent en parallèle, et la règle
// « une seule absence en cours ou en attente par enseignant » ferait échouer l'un des deux.
const ENSEIGNANT_CONGE = '0002TESTPW'
const ENSEIGNANT_DOUBLON = '0003TESTPW'

test.describe('Absences', () => {
  test.beforeAll(async () => {
    const etab = await creerEtablissementTest()
    const dep = await creerDepartementTest(etab.id)
    await creerEnseignantTest(dep.id, ENSEIGNANT_CONGE)
    await creerEnseignantTest(dep.id, ENSEIGNANT_DOUBLON)
  })

  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  test('création d’un congé de maternité, validation, puis retour', async ({ page }) => {
    await page.goto('/absences/nouveau')
    // L'enseignant se choisit dans une liste (valeur = matricule), il ne se tape pas.
    await page.getByLabel(/^enseignant/i).selectOption(ENSEIGNANT_CONGE)
    await page.getByLabel(/type d.absence/i).selectOption('CONGE_MATERNITE')
    await page.getByLabel(/date de début/i).fill('2026-04-14')
    await page.getByRole('button', { name: /créer l.absence/i }).click()

    // Le type s'affiche aussi dans le détail (« Type ») : on vise le titre de la fiche.
    await expect(page.getByRole('heading', { name: /congé de maternité/i })).toBeVisible()

    await page.getByLabel(/date de validation/i).fill('2026-04-20')
    await page.getByLabel(/auteur de la validation/i).fill('Le Recteur')
    await page.getByRole('button', { name: /^valider$/i }).click()

    // Un congé ne se termine qu'une fois son attestation signée : le serveur refuse la fin
    // d'absence avant (voir « Étapes d'une absence » dans le README).
    await page.getByRole('button', { name: /générer le brouillon d.attestation/i }).click()
    await page.getByLabel(/numéro de décision/i).fill('12/26')
    await page.getByLabel(/date de validation/i).fill('2026-04-25')
    await page.getByLabel(/auteur de la validation/i).fill('Le Recteur')
    await page.getByRole('button', { name: /marquer signée/i }).click()
    await confirmer(page, /^marquer signée$/i)

    await page.getByLabel(/date de retour/i).fill('2026-07-22')
    await page.getByRole('button', { name: /marquer terminé/i }).click()
    await confirmer(page, /enregistrer le retour/i)
    // Le retour est affiché deux fois sur la fiche (résumé du haut et bandeau du bas).
    await expect(page.getByText(/retour enregistré le/i).first()).toBeVisible()

    // L'attestation signée reste téléchargeable une fois l'absence terminée.
    const lien = page.getByRole('link', { name: /télécharger l.attestation n°12\/26/i })
    await expect(lien).toBeVisible()
    const reponse = await page.request.get((await lien.getAttribute('href')) ?? '')
    expect(reponse.status()).toBe(200)
  })

  test('refuse une deuxième absence pour un enseignant déjà en cours', async ({ page }) => {
    await page.goto('/absences/nouveau')
    await page.getByLabel(/^enseignant/i).selectOption(ENSEIGNANT_DOUBLON)
    await page.getByLabel(/type d.absence/i).selectOption('CONGE_MALADIE')
    await page.getByLabel(/date de début/i).fill('2026-08-01')
    await page.getByLabel(/date de fin/i).fill('2026-08-10')
    await page.getByRole('button', { name: /créer l.absence/i }).click()
    // La création renvoie vers la fiche de l'absence : on revient au formulaire pour la seconde.
    await expect(page.getByRole('heading', { name: /congé de maladie/i })).toBeVisible()

    await page.goto('/absences/nouveau')
    await page.getByLabel(/^enseignant/i).selectOption(ENSEIGNANT_DOUBLON)
    await page.getByLabel(/type d.absence/i).selectOption('CONGE_MALADIE')
    await page.getByLabel(/date de début/i).fill('2026-09-01')
    await page.getByLabel(/date de fin/i).fill('2026-09-05')
    await page.getByRole('button', { name: /créer l.absence/i }).click()

    await expect(page.getByText(/a déjà une absence en cours ou en attente/i)).toBeVisible()
  })
})
