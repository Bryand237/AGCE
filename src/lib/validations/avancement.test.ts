import { describe, expect, it } from 'vitest'
import { MetadonneesSessionSchema, RapportSchema, ValidationDecisionSchema } from './avancement'

function erreurs(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } },
  entree: unknown
) {
  const resultat = schema.safeParse(entree) as
    | { success: true }
    | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } }
  return resultat.success ? {} : resultat.error.flatten().fieldErrors
}

describe('RapportSchema', () => {
  const rapport = (surcharge: Record<string, unknown> = {}) => ({
    numero: '55ème',
    periodeDebut: '2025-07-01',
    periodeFin: '2025-12-31',
    ...surcharge,
  })

  it('accepte une période cohérente', () => {
    expect(RapportSchema.safeParse(rapport()).success).toBe(true)
  })

  it('accepte une période d’un seul jour', () => {
    expect(
      RapportSchema.safeParse(rapport({ periodeDebut: '2025-12-31', periodeFin: '2025-12-31' }))
        .success
    ).toBe(true)
  })

  it('refuse une fin de période antérieure au début', () => {
    expect(
      erreurs(RapportSchema, rapport({ periodeDebut: '2025-12-31', periodeFin: '2025-07-01' }))
    ).toEqual({ periodeFin: ['La fin de période ne peut pas précéder son début.'] })
  })

  it('refuse une édition réduite à des espaces et retire les espaces autour', () => {
    expect(erreurs(RapportSchema, rapport({ numero: '   ' })).numero).toEqual([
      "L'édition (numéro de session) est obligatoire.",
    ])
    const resultat = RapportSchema.safeParse(rapport({ numero: ' 55ème ' }))
    expect(resultat.success && resultat.data.numero).toBe('55ème')
  })

  it('signale une date illisible en français', () => {
    expect(erreurs(RapportSchema, rapport({ periodeDebut: '' })).periodeDebut).toEqual([
      'Le début de période est invalide ou absente.',
    ])
  })
})

describe('MetadonneesSessionSchema', () => {
  const metadonnees = (surcharge: Record<string, unknown> = {}) => ({
    referenceLoiFinances: 'Loi n° 2025/017',
    referenceCirculaire: 'Circulaire n° 01',
    dateSessionCU: '2026-01-15',
    dateSessionCA: '2026-01-20',
    dateSignatureDecisions: '',
    ...surcharge,
  })

  it('lit des métadonnées complètes', () => {
    const resultat = MetadonneesSessionSchema.safeParse(metadonnees())

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data).toEqual({
        referenceLoiFinances: 'Loi n° 2025/017',
        referenceCirculaire: 'Circulaire n° 01',
        dateSessionCU: new Date('2026-01-15'),
        dateSessionCA: new Date('2026-01-20'),
        dateSignatureDecisions: null,
      })
    }
  })

  it('accepte des métadonnées incomplètes : ce qui est vide vaut null', () => {
    const resultat = MetadonneesSessionSchema.safeParse(
      metadonnees({ referenceCirculaire: '', dateSessionCU: '', dateSessionCA: '' })
    )

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.referenceLoiFinances).toBe('Loi n° 2025/017')
      expect(resultat.data.referenceCirculaire).toBeNull()
      expect(resultat.data.dateSessionCU).toBeNull()
      expect(resultat.data.dateSessionCA).toBeNull()
    }
  })

  it('accepte une saisie entièrement vide : tout vaut null, pour pouvoir tout retirer', () => {
    const resultat = MetadonneesSessionSchema.safeParse({
      referenceLoiFinances: '',
      referenceCirculaire: '',
      dateSessionCU: '',
      dateSessionCA: '',
      dateSignatureDecisions: '',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(Object.values(resultat.data).every((v) => v === null)).toBe(true)
    }
  })

  it('traite des champs absents de la requête comme vides, sans les inventer', () => {
    const resultat = MetadonneesSessionSchema.safeParse({})

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(Object.values(resultat.data).every((v) => v === null)).toBe(true)
    }
  })

  it('retire les espaces autour des références, et traite des espaces seuls comme vides', () => {
    const resultat = MetadonneesSessionSchema.safeParse(
      metadonnees({ referenceLoiFinances: '  Loi n° 2025/017  ', referenceCirculaire: '   ' })
    )

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.referenceLoiFinances).toBe('Loi n° 2025/017')
      expect(resultat.data.referenceCirculaire).toBeNull()
    }
  })

  it('lit une date de signature renseignée', () => {
    const resultat = MetadonneesSessionSchema.safeParse(
      metadonnees({ dateSignatureDecisions: '2026-02-01' })
    )

    expect(resultat.success).toBe(true)
    if (resultat.success)
      expect(resultat.data.dateSignatureDecisions).toEqual(new Date('2026-02-01'))
  })

  it('refuse une date illisible au lieu de la transmettre à la base', () => {
    const champs = erreurs(
      MetadonneesSessionSchema,
      metadonnees({ dateSignatureDecisions: 'abc', dateSessionCU: '31/12/2025' })
    )

    expect(champs.dateSignatureDecisions).toBeDefined()
    expect(champs.dateSessionCU).toBeDefined()
  })
})

describe('ValidationDecisionSchema', () => {
  it('refuse un numéro de décision ou un auteur réduit à des espaces', () => {
    expect(
      erreurs(ValidationDecisionSchema, {
        numeroDecision: '  ',
        dateValidation: '2026-02-01',
        auteurValidation: ' ',
      })
    ).toEqual({
      numeroDecision: ['Le numéro de décision est obligatoire'],
      auteurValidation: ["L'auteur est obligatoire"],
    })
  })
})
