import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Les dates de l'application sont enregistrées à minuit UTC. Un test qui les lit avec les
 * accesseurs LOCAUX (getFullYear, getMonth, getDate, getDay, getHours…) donne la veille, le mois
 * ou l'année précédents dès que la machine est réglée à l'ouest de l'UTC : il passait à Douala
 * (UTC+1) et en CI (UTC), et échouait sur un poste à New York (audit C8, retraite.test.ts).
 *
 * Dans les tests, on lit une date avec getUTC…() ou toISOString().
 */
const RACINE_SRC = path.dirname(fileURLToPath(import.meta.url))
const RACINE_TESTS = path.join(RACINE_SRC, '..', 'tests')

function fichiersDeTest(dossier: string): string[] {
  try {
    return (readdirSync(dossier, { recursive: true }) as string[])
      .map((chemin) => chemin.split(path.sep).join('/'))
      .filter((chemin) => /\.(test|spec)\.tsx?$/.test(chemin))
      .map((chemin) => path.join(dossier, chemin))
  } catch {
    return []
  }
}

const fichiers = [...fichiersDeTest(RACINE_SRC), ...fichiersDeTest(RACINE_TESTS)].filter(
  // Ce fichier cite les noms des accesseurs interdits.
  (chemin) => !chemin.endsWith('tests-independants-du-fuseau.test.ts')
)

const ACCESSEUR_LOCAL =
  /\.(getFullYear|getMonth|getDate|getDay|getHours|getMinutes|getSeconds|getMilliseconds|getTimezoneOffset|toLocaleDateString|toLocaleTimeString|toDateString|toTimeString)\(/

const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('tests indépendants du fuseau de la machine', () => {
  it('trouve bien les fichiers de test (le contrôle ne passe pas à vide)', () => {
    expect(fichiers.length).toBeGreaterThan(50)
    expect(fichiers.some((chemin) => chemin.endsWith('retraite.test.ts'))).toBe(true)
  })

  it.each(fichiers.map((chemin) => [path.relative(RACINE_SRC, chemin), chemin]))(
    '%s ne lit pas une date avec un accesseur local',
    (_nom, chemin) => {
      const code = sansCommentaires(readFileSync(chemin as string, 'utf-8'))
      expect(code.match(ACCESSEUR_LOCAL)?.[0]).toBeUndefined()
    }
  )
})
