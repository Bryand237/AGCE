import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Ce que le navigateur envoie n'est jamais fiable : `FormData.get()` renvoie `null` quand le
 * champ est absent et un `File` quand un fichier arrive à la place d'un texte. Forcer le type
 * avec `as string` ne change rien à l'exécution : le champ absent devenait « null » en base,
 * `new Date(null)` donnait le 1er janvier 1970 et un contrôle `!valeur` laissait passer ce qu'il
 * ne prévoyait pas (audit E4).
 *
 * Dans les actions serveur et les routes, toute saisie est donc lue par un schéma de
 * `src/lib/validations` (`Schema.safeParse(Object.fromEntries(formData))`), qui dit quel champ
 * manque et refuse ce qui n'a pas la forme attendue. Les seules lectures directes tolérées
 * sont des COMPARAISONS (`formData.get('removePhoto') === 'on'`) : elles ne présument de rien.
 */
const RACINE_SRC = path.dirname(fileURLToPath(import.meta.url))

const fichiers = (readdirSync(RACINE_SRC, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter((chemin) => /^app\/.*(^|\/)(actions|route)\.ts$/.test(chemin))

const lire = (chemin: string) => readFileSync(path.join(RACINE_SRC, chemin), 'utf-8')
const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// `.get('champ') as string`, `.get('champ') as File`, `.get('champ')!` : on affirme un type
// que rien ne garantit (`!==` est une comparaison, pas une affirmation).
const TYPE_AFFIRME = /\.get\(\s*['"`][^'"`]*['"`]\s*\)\s*(as\s+\w|!(?!=))/
// `new Date(formData.get('date'))` : un champ absent (null) devient le 1er janvier 1970.
const DATE_BRUTE = /new Date\(\s*[^)]*\.get\(/
// Le contrôle « new Date(...) puis isNaN » à la main : une date se contrôle dans le schéma
// (`date()` de validations/champs.ts), qui nomme le champ fautif.
const CONTROLE_DATE_A_LA_MAIN = /\bisNaN\(|Number\.isNaN\(|\.getTime\(\)\s*\)/

describe('saisies des actions serveur et des routes', () => {
  it('trouve bien les fichiers à contrôler (le contrôle ne passe pas à vide)', () => {
    expect(fichiers.length).toBeGreaterThanOrEqual(6)
    expect(fichiers).toContain('app/(dashboard)/absences/actions.ts')
    expect(fichiers).toContain('app/(dashboard)/avancements/actions.ts')
    expect(fichiers).toContain('app/(dashboard)/avancements/[id]/rapport-pdf/route.ts')
  })

  it('reconnaît les écritures à proscrire (et pas les comparaisons)', () => {
    for (const mauvais of [
      "formData.get('motif') as string",
      "(formData.get('x') as string | null)",
      'formData.get("photo") as File',
      "formData.get('id')!",
    ]) {
      expect(mauvais).toMatch(TYPE_AFFIRME)
    }
    for (const bon of [
      "formData.get('removePhoto') === 'on'",
      "formData.get('confirmerChevauchement') !== 'oui'",
      "formData.get('dateFin') || undefined",
    ]) {
      expect(bon).not.toMatch(TYPE_AFFIRME)
    }
    expect("new Date(formData.get('dateValidation') as string)").toMatch(DATE_BRUTE)
    expect('new Date(parsed.data.dateValidation)').not.toMatch(DATE_BRUTE)
    expect('if (isNaN(dateValidation.getTime()))').toMatch(CONTROLE_DATE_A_LA_MAIN)
    expect('Number.isNaN(Number(x))').toMatch(CONTROLE_DATE_A_LA_MAIN)
    expect('const parsed = RetourAbsenceSchema.safeParse(donnees)').not.toMatch(
      CONTROLE_DATE_A_LA_MAIN
    )
  })

  it.each(fichiers)('%s n’affirme pas le type d’un champ de formulaire', (chemin) => {
    expect(sansCommentaires(lire(chemin)).match(TYPE_AFFIRME)?.[0]).toBeUndefined()
  })

  it.each(fichiers)('%s ne construit pas une date directement depuis un champ', (chemin) => {
    expect(sansCommentaires(lire(chemin)).match(DATE_BRUTE)?.[0]).toBeUndefined()
  })

  it.each(fichiers)('%s ne contrôle pas une date à la main (isNaN)', (chemin) => {
    expect(sansCommentaires(lire(chemin)).match(CONTROLE_DATE_A_LA_MAIN)?.[0]).toBeUndefined()
  })
})
