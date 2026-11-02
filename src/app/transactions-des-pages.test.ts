import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Toute transaction interactive des actions (`prisma.$transaction(async (tx) => …)`) reçoit les
 * délais de `OPTIONS_TRANSACTION` (src/lib/transactions.ts). Sans eux, Prisma annule la
 * transaction au bout de 5 s : la validation d'un grand rapport d'avancement échouait sur une
 * page d'erreur, sans que l'utilisateur sache si quelque chose avait été enregistré.
 */
const DOSSIER_APP = path.join(path.dirname(fileURLToPath(import.meta.url)))

const sources = (readdirSync(DOSSIER_APP, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter((chemin) => /\.(ts|tsx)$/.test(chemin) && !/\.(test|spec)\.tsx?$/.test(chemin))

const lire = (chemin: string) => readFileSync(path.join(DOSSIER_APP, chemin), 'utf-8')
const sansCommentaires = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const transactions = (code: string) => code.match(/\$transaction\(\s*async\b/g)?.length ?? 0
const avecDelais = (code: string) => code.match(/\},\s*OPTIONS_TRANSACTION\s*\)/g)?.length ?? 0

const fichiersAvecTransaction = sources.filter(
  (chemin) => transactions(sansCommentaires(lire(chemin))) > 0
)

describe('transactions interactives des actions', () => {
  it('trouve bien les actions qui ouvrent une transaction (le test ne passe pas à vide)', () => {
    expect(fichiersAvecTransaction).toContain('(dashboard)/avancements/actions.ts')
  })

  it.each(fichiersAvecTransaction)(
    '%s passe OPTIONS_TRANSACTION à chaque transaction',
    (chemin) => {
      const code = sansCommentaires(lire(chemin))
      expect(avecDelais(code)).toBe(transactions(code))
    }
  )
})
