import { test, expect } from '@playwright/test'

// Sans cookie de session, aucune page ni aucun téléchargement ne doit répondre 200 :
// le proxy renvoie vers /connexion (307), ou la route répond 401.
// `request` est un client HTTP sans cookie ; maxRedirects: 0 évite de suivre la
// redirection jusqu'à la page de connexion (qui, elle, répond 200).
const ID = '00000000-0000-0000-0000-000000000000'

const CHEMINS_PROTEGES = [
  '/enseignants',
  '/enseignants/liste-pdf',
  `/avancements/${ID}/rapport-pdf`,
  `/avancements/${ID}/${ID}/decision`,
  `/absences/${ID}/attestation`,
]

test.describe('Accès sans connexion', () => {
  for (const chemin of CHEMINS_PROTEGES) {
    test(`${chemin} n’est pas accessible sans connexion`, async ({ request }) => {
      const reponse = await request.get(chemin, { maxRedirects: 0 })

      expect([307, 401]).toContain(reponse.status())
      if (reponse.status() === 307) {
        expect(reponse.headers()['location']).toContain('/connexion')
      }
    })
  }

  test('la page de connexion reste accessible', async ({ request }) => {
    const reponse = await request.get('/connexion', { maxRedirects: 0 })

    expect(reponse.status()).toBe(200)
  })
})
