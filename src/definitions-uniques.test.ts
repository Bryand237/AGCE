import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Ce qui doit n'exister qu'à UN endroit (audit E1). Ces éléments étaient écrits plusieurs fois, et
 * les copies avaient commencé à diverger : deux `formatDateInput` dont l'un acceptait du texte et
 * l'autre non, cinq `EtatFormulaire`, trois tables de libellés d'absence. Corriger l'un en oubliait
 * les autres. Une nouvelle copie fait échouer ce test : importer l'original.
 */
const RACINE_SRC = path.dirname(fileURLToPath(import.meta.url))

const sources = (readdirSync(RACINE_SRC, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter(
    (chemin) =>
      /\.tsx?$/.test(chemin) &&
      !/\.(test|spec)\.tsx?$/.test(chemin) &&
      !chemin.startsWith('generated/')
  )

const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const codes = new Map(
  sources.map((chemin) => [
    chemin,
    sansCommentaires(readFileSync(path.join(RACINE_SRC, chemin), 'utf-8')),
  ])
)

// Une définition, pas un import : `type X = …` (et non `import { type X }`), `const X`, `function X`…
function definiPar(nom: string): string[] {
  const definition = new RegExp(
    `\\btype\\s+${nom}\\b(?:<[^=]*>)?\\s*=|\\b(?:interface|const|let|var|function|class)\\s+${nom}\\b`
  )
  return sources.filter((chemin) => definition.test(codes.get(chemin) ?? ''))
}

const UNIQUES: [nom: string, endroit: string][] = [
  ['EtatFormulaire', 'lib/formulaires.ts'],
  ['EtatFormulaireAvancement', 'app/(dashboard)/avancements/actions.ts'],
  ['LIBELLES_TYPE_ABSENCE', 'domain/absences/etatAbsence.ts'],
  ['LIBELLES_STATUT_ABSENCE', 'domain/absences/statutEffectif.ts'],
  ['LIBELLES_TYPE_ETABLISSEMENT', 'domain/etablissements/typeEtablissement.ts'],
  ['TYPES_ETABLISSEMENT', 'domain/etablissements/typeEtablissement.ts'],
  ['valeurChampDate', 'domain/dates/valeurChampDate.ts'],
  ['formaterDateIso', 'domain/dates/jourCivil.ts'],
  ['formaterDateCourte', 'domain/dates/formaterDateCourte.ts'],
  ['formaterDateMoisEnLettres', 'domain/dates/formaterDateMoisEnLettres.ts'],
]

describe('éléments définis une seule fois', () => {
  it('trouve bien les fichiers source (le contrôle ne passe pas à vide)', () => {
    expect(sources.length).toBeGreaterThan(150)
    expect(definiPar('EtatFormulaire')).toHaveLength(1)
  })

  it.each(UNIQUES)('%s n’est défini que dans %s', (nom, endroit) => {
    expect(definiPar(nom)).toEqual([endroit])
  })

  it.each(['formatDateInput', 'LIBELLES_TYPE', 'calculerAncienneteAnnees'])(
    '%s n’existe plus : il est remplacé par la version partagée',
    (nom) => {
      expect(definiPar(nom)).toEqual([])
    }
  )
})
