import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// 'use server' est réservé aux fichiers d'actions (actions.ts). Placé en tête d'une
// page, d'un layout ou d'une route, il transforme leur composant en fonction serveur
// appelable de l'extérieur, et interdit d'y exporter autre chose qu'une fonction
// asynchrone (metadata, dynamic…).
const DOSSIER_APP = path.dirname(fileURLToPath(import.meta.url))
const FICHIERS_DE_ROUTAGE =
  /^(page|layout|template|route|loading|error|not-found|default)\.[jt]sx?$/
const DIRECTIVE_EN_TETE = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use server['"]/

describe("directive 'use server'", () => {
  it('ne figure dans aucune page, aucun layout ni aucune route', () => {
    const fautifs = (readdirSync(DOSSIER_APP, { recursive: true }) as string[])
      .map((chemin) => chemin.split(path.sep).join('/'))
      .filter((chemin) => FICHIERS_DE_ROUTAGE.test(path.posix.basename(chemin)))
      .filter((chemin) =>
        DIRECTIVE_EN_TETE.test(readFileSync(path.join(DOSSIER_APP, chemin), 'utf-8'))
      )

    expect(fautifs).toEqual([])
  })
})
