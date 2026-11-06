import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * La recherche libre des listes suit une seule règle, `contientTousLesMots`
 * (src/domain/texte/contientTousLesMots.ts) : chaque mot saisi se retrouve quelque part, sans
 * tenir compte de la casse ni des accents. Deux formes la contournent et ont déjà produit des
 * recherches qui ne trouvent rien ou trouvent autre chose :
 *
 *   - `contains: recherche` envoie la saisie ENTIÈRE à la base : « Alice Mbarga » ne trouve pas
 *     Alice MBARGA, « Ndé » ne trouve pas « Nde » ;
 *   - `new Date(recherche)` lit comme des dates « 54 », « 2026 » ou « 2026-003 ».
 */
const DOSSIER_APP = path.join(path.dirname(fileURLToPath(import.meta.url)))

/**
 * Les lectures qui cherchent encore par `contains` : la liste des établissements (un seul champ,
 * le nom, et une saisie courte). À retirer de cette liste si elle passe à la recherche par mots.
 */
const CONTAINS_TOLERE = ['(dashboard)/etablissements/donnees.ts']

const sources = (readdirSync(DOSSIER_APP, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter((chemin) => /\.(ts|tsx)$/.test(chemin) && !/\.(test|spec)\.tsx?$/.test(chemin))

const lire = (chemin: string) => readFileSync(path.join(DOSSIER_APP, chemin), 'utf-8')
const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('recherche des listes', () => {
  it('trouve bien les lectures concernées (le test ne passe pas à vide)', () => {
    expect(sources).toEqual(
      expect.arrayContaining([
        '(dashboard)/absences/donnees.ts',
        '(dashboard)/avancements/donnees.ts',
        '(dashboard)/etablissements/donnees.ts',
      ])
    )
  })

  it.each(sources.filter((chemin) => !CONTAINS_TOLERE.includes(chemin)))(
    '%s ne cherche pas la saisie entière avec contains',
    (chemin) => {
      const code = sansCommentaires(lire(chemin))
      expect(code.match(/contains:\s*\w*\.?(recherche|saisie)\b/)?.[0]).toBeUndefined()
    }
  )

  it.each(sources)(
    '%s ne lit pas la saisie de recherche comme une date avec new Date()',
    (chemin) => {
      const code = sansCommentaires(lire(chemin))
      expect(code.match(/new Date\(\s*\w*\.?(recherche|saisie)\b/)?.[0]).toBeUndefined()
    }
  )

  it('la liste des absences et celle des rapports utilisent la règle commune', () => {
    expect(sansCommentaires(lire('(dashboard)/absences/donnees.ts'))).toContain(
      'identiteCorrespond('
    )
    expect(sansCommentaires(lire('(dashboard)/avancements/donnees.ts'))).toContain(
      'contientTousLesMots('
    )
  })
})
