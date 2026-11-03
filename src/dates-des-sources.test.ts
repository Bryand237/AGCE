import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Les dates de l'application sont enregistrées à minuit UTC. Les lire, les calculer ou les
 * afficher avec les accesseurs LOCAUX (getFullYear, getDate, setDate, toLocaleDateString…) donne
 * la veille, le mois ou l'année précédents sur une machine réglée à l'ouest de l'UTC, et un jour
 * de décalage dès que le fuseau change d'heure légale entre deux dates (audit D8).
 *
 * Dans le code de l'application, on lit une date avec getUTC…() ou avec les fonctions de
 * `src/domain/dates` (formaterDateCourte, formaterDateMoisEnLettres, valeurChampDate…).
 * La seule exception est `jourLocalDe` (jourCivil.ts), qui donne le jour du calendrier de
 * l'utilisateur pour un instant : c'est la porte unique entre l'heure locale et les dates.
 */
const RACINE_SRC = path.dirname(fileURLToPath(import.meta.url))

const EXCEPTIONS = ['domain/dates/jourCivil.ts']

const sources = (readdirSync(RACINE_SRC, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter(
    (chemin) =>
      /\.tsx?$/.test(chemin) &&
      !/\.(test|spec)\.tsx?$/.test(chemin) &&
      // Le client Prisma généré n'est pas du code de l'application.
      !chemin.startsWith('generated/')
  )

const lire = (chemin: string) => readFileSync(path.join(RACINE_SRC, chemin), 'utf-8')
const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ACCESSEUR_LOCAL =
  /\.(getFullYear|getMonth|getDate|getDay|getHours|getMinutes|getSeconds|getMilliseconds|getTimezoneOffset|setFullYear|setMonth|setDate|setHours|setMinutes|setSeconds|setMilliseconds|toLocaleDateString|toLocaleTimeString|toDateString|toTimeString)\(/
// « AAAA-MM-JJ » s'écrit par formaterDateIso / valeurChampDate : une seule définition (audit E1).
const DECOUPE_ISO = /\.toISOString\(\)\s*\.(slice|substring|substr|split)\(/

describe('dates du code de l’application', () => {
  it('trouve bien les fichiers source (le contrôle ne passe pas à vide)', () => {
    expect(sources.length).toBeGreaterThan(150)
    expect(sources).toContain('domain/dates/jourCivil.ts')
    expect(sources).toContain('app/(dashboard)/absences/[id]/page.tsx')
    expect(sources.some((chemin) => chemin.startsWith('generated/'))).toBe(false)
  })

  it.each(sources.filter((chemin) => !EXCEPTIONS.includes(chemin)))(
    '%s ne lit pas une date avec un accesseur local',
    (chemin) => {
      const code = sansCommentaires(lire(chemin))
      expect(code.match(ACCESSEUR_LOCAL)?.[0]).toBeUndefined()
    }
  )

  it.each(sources)('%s n’écrit pas « AAAA-MM-JJ » à la main', (chemin) => {
    const code = sansCommentaires(lire(chemin))
    expect(code.match(DECOUPE_ISO)?.[0]).toBeUndefined()
  })

  it.each(EXCEPTIONS)('l’exception %s est encore nécessaire', (chemin) => {
    // Si la fonction n'utilise plus l'heure locale, l'exception ne protège plus rien : la retirer.
    expect(sansCommentaires(lire(chemin))).toMatch(ACCESSEUR_LOCAL)
  })
})
