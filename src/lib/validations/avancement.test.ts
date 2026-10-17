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

  it('accepte une date de signature vide (elle reste absente)', () => {
    const resultat = MetadonneesSessionSchema.safeParse(metadonnees())
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.dateSignatureDecisions).toBeUndefined()
  })

  it('lit une date de signature renseignée', () => {
    const resultat = MetadonneesSessionSchema.safeParse(
      metadonnees({ dateSignatureDecisions: '2026-02-01' })
    )
    expect(resultat.success).toBe(true)
    if (resultat.success)
      expect(resultat.data.dateSignatureDecisions).toEqual(new Date('2026-02-01'))
  })

  it('refuse une date de signature illisible au lieu de la transmettre à la base', () => {
    expect(
      erreurs(MetadonneesSessionSchema, metadonnees({ dateSignatureDecisions: 'abc' }))
        .dateSignatureDecisions
    ).toBeDefined()
  })

  it('refuse des références réduites à des espaces', () => {
    const champs = erreurs(
      MetadonneesSessionSchema,
      metadonnees({ referenceLoiFinances: '  ', referenceCirculaire: ' ' })
    )
    expect(champs.referenceLoiFinances).toEqual(['La loi de finances est obligatoire'])
    expect(champs.referenceCirculaire).toEqual(['La circulaire est obligatoire'])
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
