import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Un dossier de `src/app` qui ne contient que des `loading.tsx` ou des `not-found.tsx`, sans page
 * ni route en dessous, n'est pas une adresse de l'application : Next.js l'ignore, et son
 * `not-found.tsx` renvoyait vers une adresse qui n'existe pas (audit E2 : `impressions/` et
 * `imprimer/`). Ce test fait échouer un tel dossier.
 */
const DOSSIER_APP = path.dirname(fileURLToPath(import.meta.url))

const chemins = (readdirSync(DOSSIER_APP, { recursive: true }) as string[]).map((chemin) =>
  chemin.split(path.sep).join('/')
)
const nomDe = (chemin: string) => chemin.split('/').pop() ?? ''

const EST_PAGE = /^(page|route)\.(tsx?|jsx?)$/
const EST_HABILLAGE = /^(loading|not-found|error)\.(tsx?|jsx?)$/

const dossiersHabilles = [
  ...new Set(
    chemins
      .filter((chemin) => EST_HABILLAGE.test(nomDe(chemin)))
      .map((chemin) => chemin.split('/').slice(0, -1).join('/'))
  ),
]

const aUnePageSousLeDossier = (dossier: string) =>
  chemins.some(
    (chemin) => EST_PAGE.test(nomDe(chemin)) && (dossier === '' || chemin.startsWith(`${dossier}/`))
  )

describe('dossiers de src/app', () => {
  it('trouve bien des pages et des dossiers habillés (le test ne passe pas à vide)', () => {
    expect(chemins.filter((chemin) => EST_PAGE.test(nomDe(chemin))).length).toBeGreaterThan(15)
    expect(dossiersHabilles.length).toBeGreaterThan(10)
  })

  it.each(dossiersHabilles.map((dossier) => dossier || '(racine)'))(
    '%s contient une page ou une route (lui-même ou en dessous)',
    (dossier) => {
      expect(aUnePageSousLeDossier(dossier === '(racine)' ? '' : dossier)).toBe(true)
    }
  )
})
