import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Une action serveur est une adresse HTTP appelable sans passer par la page qui l'affiche :
// le layout du tableau de bord ne protège que l'affichage. Chaque action exportée doit donc
// vérifier elle-même la session (exigerUtilisateur), en toute première ligne.
//
// Deux familles de tests :
//  1. structurels : lisent les sources et échouent dès qu'une action (même future) n'a pas sa
//     garde, ou qu'une forme d'export échappe à cette vérification ;
//  2. de comportement : appellent réellement chaque action sans session valide et vérifient
//     qu'elle renvoie vers /connexion sans toucher à la base.

// ───────────── Simulations ─────────────
const { cookieDeSession, accesBase, prismaFactice, sessionFindUnique } = vi.hoisted(() => {
  const accesBase: string[] = []
  const sessionFindUnique = vi.fn()

  // Tout appel à la base (n'importe quelle table, n'importe quelle méthode) est consigné,
  // sauf la lecture de la session, qui est ce que l'on cherche à contrôler.
  const enregistreur = (chemin: string): unknown =>
    new Proxy(function () {}, {
      get: (_cible, propriete) =>
        propriete === 'then' ? undefined : enregistreur(`${chemin}.${String(propriete)}`),
      apply: () => {
        accesBase.push(chemin)
        return Promise.resolve(null)
      },
    })
  const prismaFactice = new Proxy({} as Record<string, unknown>, {
    get: (_cible, table) =>
      table === 'session' ? { findUnique: sessionFindUnique } : enregistreur(String(table)),
  })

  return {
    cookieDeSession: { valeur: undefined as string | undefined },
    accesBase,
    prismaFactice,
    sessionFindUnique,
  }
})

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nom: string) =>
      nom === 'session' && cookieDeSession.valeur ? { value: cookieDeSession.valeur } : undefined,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// Comme dans Next.js, redirect() interrompt l'exécution en levant une exception.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  }),
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaFactice }))
vi.mock('@/lib/documents/genererAttestationAbsence', () => ({ genererAttestationAbsence: vi.fn() }))
vi.mock('@/lib/documents/genererDecisionAvancement', () => ({ genererDecisionAvancement: vi.fn() }))

// La garde réelle (src/lib/auth.ts) est utilisée : on teste la chaîne complète.
const modulesDActions = {
  absences: await import('./(dashboard)/absences/actions'),
  avancements: await import('./(dashboard)/avancements/actions'),
  dashboard: await import('./(dashboard)/dashboard/actions'),
  enseignants: await import('./(dashboard)/enseignants/actions'),
  etablissements: await import('./(dashboard)/etablissements/actions'),
}

const dans = (ms: number) => new Date(Date.now() + ms)
const UTILISATEUR = { id: 'u-1', nomUtilisateur: 'MBALA' }

// ───────────── 1. Tests structurels ─────────────
const DOSSIER_SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIRECTIVE_EN_TETE = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use server['"]/
const GARDE = 'await exigerUtilisateur()'

// Seules actions volontairement ouvertes : sans elles, personne ne pourrait se connecter.
// seDeconnecter ne lit que le cookie de l'appelant et ne touche à aucune donnée métier.
const PUBLIQUES: Record<string, string[]> = {
  'app/connexion/actions.ts': ['seConnecter', 'seDeconnecter'],
}

function sourcesDeProduction(): string[] {
  return (readdirSync(DOSSIER_SRC, { recursive: true }) as string[])
    .map((chemin) => chemin.split(path.sep).join('/'))
    .filter((chemin) => /\.(ts|tsx)$/.test(chemin) && !/\.(test|spec)\.tsx?$/.test(chemin))
    .filter((chemin) => !chemin.startsWith('generated/'))
}

const lire = (chemin: string) => readFileSync(path.join(DOSSIER_SRC, chemin), 'utf-8')
const fichiersServeur = sourcesDeProduction().filter((chemin) =>
  /['"]use server['"]/.test(lire(chemin))
)

describe('actions serveur : la garde est présente dans les sources', () => {
  it('trouve bien les fichiers d’actions (le test ne passe pas à vide)', () => {
    expect(fichiersServeur).toEqual(
      expect.arrayContaining([
        'app/(dashboard)/absences/actions.ts',
        'app/(dashboard)/avancements/actions.ts',
        'app/(dashboard)/dashboard/actions.ts',
        'app/(dashboard)/enseignants/actions.ts',
        'app/(dashboard)/etablissements/actions.ts',
        'app/connexion/actions.ts',
      ])
    )
  })

  it("n'accepte la directive 'use server' qu'en tête de fichier (pas dans le corps d'une fonction)", () => {
    const horsEntete = fichiersServeur.filter((chemin) => !DIRECTIVE_EN_TETE.test(lire(chemin)))
    expect(horsEntete).toEqual([])
  })

  it.each(fichiersServeur)('%s : chaque action exportée commence par la garde', (chemin) => {
    const source = lire(chemin)
    const ouvertes = PUBLIQUES[chemin] ?? []

    // Toute forme d'export autre que « export async function » (et les types) échapperait
    // à la vérification ci-dessous : on la refuse plutôt que de la laisser passer.
    const autresExports = source
      .split('\n')
      .filter((ligne) => /^export\s/.test(ligne))
      .filter((ligne) => !/^export (async function \w+|type |interface )/.test(ligne))
    expect(autresExports).toEqual([])

    const actions = [
      ...source.matchAll(/export async function (\w+)\s*\([\s\S]*?\)[^{]*\{\s*\n\s*([^\n]*)/g),
    ].map(([, nom, premiereLigne]) => ({ nom, premiereLigne: premiereLigne?.trim() }))
    expect(actions.length).toBe((source.match(/^export async function /gm) ?? []).length)

    const sansGarde = actions
      .filter(({ nom }) => !ouvertes.includes(nom ?? ''))
      .filter(({ premiereLigne }) => premiereLigne !== GARDE)
      .map(({ nom }) => nom)
    expect(sansGarde).toEqual([])
  })

  it('laisse seConnecter ouverte : exiger une session pour se connecter bloquerait tout le monde', () => {
    const source = lire('app/connexion/actions.ts')
    const corps = source.slice(source.indexOf('export async function seConnecter'))
    expect(corps.slice(0, corps.indexOf('export async function seDeconnecter'))).not.toContain(
      'exigerUtilisateur'
    )
  })
})

// ───────────── 2. Tests de comportement ─────────────
type Action = (...args: unknown[]) => unknown

const actions = Object.entries(modulesDActions).flatMap(([fichier, exportsDuFichier]) =>
  Object.entries(exportsDuFichier)
    .filter(([, valeur]) => typeof valeur === 'function')
    .map(([nom, fonction]): [string, Action] => [
      `${fichier}/${nom}`,
      fonction as unknown as Action,
    ])
)

const SANS_SESSION_VALIDE: Array<[string, () => void]> = [
  ['aucun cookie', () => (cookieDeSession.valeur = undefined)],
  [
    'cookie inconnu',
    () => {
      cookieDeSession.valeur = 'jeton-inconnu'
      sessionFindUnique.mockResolvedValue(null)
    },
  ],
  [
    'session expirée',
    () => {
      cookieDeSession.valeur = 'jeton-expire'
      sessionFindUnique.mockResolvedValue({ expiresAt: dans(-1000), utilisateur: UTILISATEUR })
    },
  ],
]

describe('actions serveur : sans session valide, rien ne s’exécute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accesBase.length = 0
    cookieDeSession.valeur = undefined
  })

  it('couvre bien les actions des cinq fichiers (le test ne passe pas à vide)', () => {
    expect(actions.length).toBeGreaterThanOrEqual(31)
  })

  describe.each(SANS_SESSION_VALIDE)('%s', (_cas, preparer) => {
    it.each(actions)('%s renvoie vers /connexion sans toucher à la base', async (_nom, action) => {
      preparer()

      // Les arguments importent peu : la garde passe avant que l'action les lise.
      await expect(
        Promise.resolve().then(() => action('id-1', {}, new FormData()))
      ).rejects.toThrow('NEXT_REDIRECT /connexion')
      expect(accesBase).toEqual([])
    })
  })
})

describe('actions serveur : avec une session valide, elles s’exécutent normalement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accesBase.length = 0
    cookieDeSession.valeur = 'jeton-valide'
    sessionFindUnique.mockResolvedValue({
      expiresAt: dans(60 * 60 * 1000),
      utilisateur: UTILISATEUR,
    })
  })

  it('une suppression d’absence atteint la base puis revient à la liste', async () => {
    await expect(modulesDActions.absences.supprimerAbsence('abs-1')).rejects.toThrow(
      'NEXT_REDIRECT /absences'
    )
    expect(accesBase).toContain('absence.delete')
  })

  it('les données du tableau de bord sont lues', async () => {
    await modulesDActions.dashboard.getRepartitionParRegion()

    expect(accesBase.length).toBeGreaterThan(0)
  })
})
