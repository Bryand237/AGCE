import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Les listes paginées lisent leur page avec `lirePage` et la bornent avec `bornerPage`
 * (src/lib/pagination.ts). Les formes qui les contournent ont déjà produit une page d'erreur :
 *
 *   - `Number(params.page ?? 1)` laisse passer `abc`, `0`, `-3` ou `2.5`, que Prisma refuse comme
 *     valeur de `skip` ;
 *   - un `skip` calculé à la main ne ramène pas `?page=999` à la dernière page.
 */
const DOSSIER_APP = path.join(path.dirname(fileURLToPath(import.meta.url)))

const sources = (readdirSync(DOSSIER_APP, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter((chemin) => /\.(ts|tsx)$/.test(chemin) && !/\.(test|spec)\.tsx?$/.test(chemin))

const lire = (chemin: string) => readFileSync(path.join(DOSSIER_APP, chemin), 'utf-8')
const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('pagination des listes', () => {
  it('trouve bien les pages et les fichiers de lecture (le test ne passe pas à vide)', () => {
    expect(sources).toEqual(
      expect.arrayContaining([
        '(dashboard)/absences/page.tsx',
        '(dashboard)/absences/donnees.ts',
        '(dashboard)/avancements/donnees.ts',
        '(dashboard)/etablissements/donnees.ts',
      ])
    )
  })

  it.each(sources)('%s ne lit pas le numéro de page avec Number()', (chemin) => {
    const code = sansCommentaires(lire(chemin))
    expect(code.match(/Number\(\s*\w+\??\.page\b[^)]*\)/)?.[0]).toBeUndefined()
  })

  it.each(sources.filter((chemin) => /\bskip:/.test(sansCommentaires(lire(chemin)))))(
    '%s borne la page avant de la lire (bornerPage)',
    (chemin) => {
      expect(sansCommentaires(lire(chemin))).toContain('bornerPage(')
    }
  )

  it('au moins trois fichiers lisent une page de la base (le contrôle précédent n’est pas vide)', () => {
    const avecSkip = sources.filter((chemin) => /\bskip:/.test(sansCommentaires(lire(chemin))))
    expect(avecSkip.length).toBeGreaterThanOrEqual(3)
  })
})
