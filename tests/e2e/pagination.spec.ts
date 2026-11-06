import { test, expect } from '@playwright/test'
import { seConnecter } from './helpers'

// Un favori modifié ou une adresse saisie à la main ne doit jamais produire une page d'erreur :
// un numéro de page invalide ouvre la première page, un numéro trop grand la dernière.
const LISTES = [
  { adresse: '/absences', titre: 'Absences' },
  { adresse: '/avancements', titre: 'Avancements' },
  { adresse: '/etablissements', titre: 'Établissements' },
]

const PAGES_INVALIDES = ['abc', '0', '-3', '2.5', '999']

test.describe('Numéro de page dans l’adresse', () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page)
  })

  for (const { adresse, titre } of LISTES) {
    for (const valeur of PAGES_INVALIDES) {
      test(`${adresse}?page=${valeur} affiche une liste, pas une erreur`, async ({ page }) => {
        const reponse = await page.goto(`${adresse}?page=${valeur}`)

        expect(reponse?.status()).toBeLessThan(400)
        await expect(page.getByRole('heading', { name: titre, level: 1 })).toBeVisible()
        // « Page N sur M » : N est dans [1, M], jamais 0, négatif ni au-delà de la dernière.
        const indicateur = await page
          .getByText(/^Page \d+ sur \d+/)
          .first()
          .innerText()
        const [, n, m] = /Page (\d+) sur (\d+)/.exec(indicateur) ?? []
        expect(Number(n)).toBeGreaterThanOrEqual(1)
        expect(Number(n)).toBeLessThanOrEqual(Number(m))
      })
    }
  }
})
