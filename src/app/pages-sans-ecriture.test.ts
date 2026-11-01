import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Afficher une page ne modifie jamais la base.
 *
 * Une page est lue, rechargée, préchargée par le navigateur, parfois affichée deux fois : si elle
 * écrit, chaque ouverture lance une requête de modification que personne n'a demandée, et la
 * donnée ne change que si quelqu'un ouvre cette page-là (c'était le cas du statut « dépassé »
 * des absences, avant qu'il soit calculé à la lecture : audit D9). Les écritures ont leur place
 * dans les actions serveur (actions.ts), pas dans les pages ni dans leurs fichiers de lecture.
 */
const DOSSIER_SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const FICHIERS_DE_LECTURE = /(^|\/)(page\.tsx|layout\.tsx|donnees\.ts)$/
const ECRITURE_PRISMA =
  /\bprisma\.\w+\.(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\s*\(|\$executeRaw|\$executeRawUnsafe/

const fichiers = (readdirSync(DOSSIER_SRC, { recursive: true }) as string[])
  .map((chemin) => chemin.split(path.sep).join('/'))
  .filter((chemin) => FICHIERS_DE_LECTURE.test(chemin) && !chemin.startsWith('generated/'))

describe('les pages et leurs fichiers de lecture n’écrivent pas en base', () => {
  it('trouve bien les fichiers à contrôler (le test ne passe pas à vide)', () => {
    expect(fichiers).toEqual(
      expect.arrayContaining([
        'app/(dashboard)/absences/page.tsx',
        'app/(dashboard)/absences/donnees.ts',
        'app/(dashboard)/layout.tsx',
      ])
    )
  })

  it.each(fichiers)('%s', (chemin) => {
    const source = readFileSync(path.join(DOSSIER_SRC, chemin), 'utf-8')
    // Les commentaires peuvent parler d'écriture (ils expliquent justement pourquoi il n'y en a pas).
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code.match(ECRITURE_PRISMA)?.[0]).toBeUndefined()
  })
})
