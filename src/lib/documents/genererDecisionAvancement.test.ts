import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EchelonIndiciaire } from '@/generated/prisma/client'

// Le gabarit Word et la bibliothèque de publipostage sont simulés : on vérifie ici les VALEURS
// que la décision reçoit (dates, noms, positions), pas le rendu du fichier.
const { capture } = vi.hoisted(() => ({
  capture: { fichier: '', donnees: {} as Record<string, unknown> },
}))
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn((chemin: string) => {
      capture.fichier = chemin
      return 'binaire'
    }),
  },
}))
vi.mock('pizzip', () => ({ default: class {} }))
vi.mock('docxtemplater', () => ({
  default: class {
    render(donnees: Record<string, unknown>) {
      capture.donnees = donnees
    }
    toBuffer() {
      return Buffer.from('docx')
    }
  },
}))

const { genererDecisionAvancement } = await import('./genererDecisionAvancement')

function position(echelon: number, indice: number): EchelonIndiciaire {
  return {
    id: `pos-${echelon}`,
    grade: 'CHARGE_DE_COURS',
    voie: 'AUCUNE',
    sousCategorie: null,
    classe: 2,
    echelon,
    indice,
    ordre: echelon,
  }
}

const RAPPORT = {
  referenceLoiFinances:
    "la loi n°2025/012 du 17 décembre 2025, portant loi de Finances pour l'exercice 2026",
  referenceCirculaire: 'la circulaire n° 00001877/C/MINFI du 31 décembre 2025',
  dateSessionCU: new Date('2025-12-22'),
  dateSessionCA: new Date('2026-01-07'),
  dateSignatureDecisions: null,
}

function generer(surcharge: Partial<Parameters<typeof genererDecisionAvancement>[0]> = {}) {
  genererDecisionAvancement({
    enseignant: {
      nom: 'Akoa Owona',
      prenom: 'Placide',
      matricule: '1134259T',
      grade: 'CHARGE_DE_COURS',
      sexe: 'M',
    },
    anciennePosition: position(2, 785),
    nouvellePosition: position(3, 870),
    dateAncienEffet: new Date('2023-11-26'),
    dateNouvelEffet: new Date('2025-11-26'),
    numeroDecision: '0412',
    rapport: RAPPORT,
    ...surcharge,
  })
  return capture.donnees
}

describe('genererDecisionAvancement', () => {
  beforeEach(() => {
    capture.fichier = ''
    capture.donnees = {}
  })

  it('remplit le gabarit de la décision d’avancement', () => {
    generer()

    expect(capture.fichier).toMatch(/templates[\\/]decision-avancement\.docx$/)
  })

  it('écrit les dates en toutes lettres, comme la décision originale', () => {
    const d = generer()

    expect(d.dateAncienEffet).toBe('26 novembre 2023')
    expect(d.dateNouvelEffet).toBe('26 novembre 2025')
    expect(d.dateSessionCU).toBe('22 décembre 2025')
    expect(d.dateSessionCA).toBe('7 janvier 2026')
  })

  it('écrit « 1er » pour le premier du mois', () => {
    const d = generer({
      dateAncienEffet: new Date('2023-07-01'),
      dateNouvelEffet: new Date('2025-07-01'),
    })

    expect(d.dateAncienEffet).toBe('1er juillet 2023')
    expect(d.dateNouvelEffet).toBe('1er juillet 2025')
  })

  it('laisse un blanc pour une date absente (la décision se complète à la main)', () => {
    const d = generer({ rapport: { ...RAPPORT, dateSessionCU: null, dateSessionCA: null } })

    expect(d.dateSessionCU).toBe('')
    expect(d.dateSessionCA).toBe('')
    expect(d.dateSignature).toBe('')
  })

  it('préfère la date de signature donnée à celle du rapport', () => {
    const d = generer({
      dateSignature: new Date('2026-02-03'),
      rapport: { ...RAPPORT, dateSignatureDecisions: new Date('2026-01-15') },
    })

    expect(d.dateSignature).toBe('3 février 2026')
  })

  it('écrit les positions comme la décision originale : « 2ème Classe 2ème Echelon »', () => {
    const d = generer()

    expect(d.ancienneClasseLibelle).toBe('2ème Classe 2ème Echelon')
    expect(d.nouvelleClasseLibelle).toBe('2ème Classe 3ème Echelon')
    expect(d.ancienIndice).toBe(785)
    expect(d.nouvelIndice).toBe(870)
  })

  it('écrit le nom en capitales', () => {
    expect(generer().nomComplet).toBe('AKOA OWONA PLACIDE')
  })

  it('utilise l’apostrophe typographique dans les références saisies', () => {
    expect(generer().referenceLoiFinances).toBe(
      'la loi n°2025/012 du 17 décembre 2025, portant loi de Finances pour l’exercice 2026'
    )
  })

  it('accorde la civilité au sexe de l’enseignant', () => {
    expect(generer().civilite).toBe('Monsieur')
    expect(
      generer({
        enseignant: {
          nom: 'Biloo',
          prenom: 'Brigitte',
          matricule: '1234567A',
          grade: 'ASSISTANT',
          sexe: 'F',
        },
      }).civilite
    ).toBe('Madame')
  })
})
