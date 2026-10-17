import { describe, expect, it } from 'vitest'
import { AbsenceSchema, ModificationAbsenceSchema } from './absence'

function absence(surcharge: Record<string, unknown> = {}) {
  return {
    matricule: '12345',
    type: 'MISSION',
    dateDebut: '2026-03-01',
    dateFin: '2026-03-31',
    motif: '',
    ...surcharge,
  }
}

function erreurs(schema: typeof AbsenceSchema | typeof ModificationAbsenceSchema, entree: unknown) {
  const resultat = schema.safeParse(entree)
  return resultat.success ? {} : resultat.error.flatten().fieldErrors
}

describe('AbsenceSchema', () => {
  it('accepte une période cohérente', () => {
    expect(AbsenceSchema.safeParse(absence()).success).toBe(true)
  })

  it('accepte une fin le jour même du début', () => {
    expect(AbsenceSchema.safeParse(absence({ dateFin: '2026-03-01' })).success).toBe(true)
  })

  it('refuse une fin antérieure au début', () => {
    expect(
      erreurs(AbsenceSchema, absence({ dateDebut: '2026-03-31', dateFin: '2026-03-01' }))
    ).toEqual({
      dateFin: ['La date de fin ne peut pas précéder la date de début.'],
    })
  })

  it('accepte l’absence de date de fin (congé de maternité : fin calculée)', () => {
    const entree: Record<string, unknown> = absence({ type: 'CONGE_MATERNITE' })
    delete entree.dateFin
    expect(AbsenceSchema.safeParse(entree).success).toBe(true)
  })

  it('refuse un matricule réduit à des espaces', () => {
    expect(erreurs(AbsenceSchema, absence({ matricule: '   ' })).matricule).toEqual([
      'Le matricule est obligatoire',
    ])
  })

  it('demande un type d’absence en français', () => {
    expect(erreurs(AbsenceSchema, absence({ type: '' })).type).toEqual([
      "Le type d'absence est obligatoire.",
    ])
  })

  it('refuse une date absente de la requête au lieu de la lire comme le 01/01/1970', () => {
    // FormData.get() renvoie null pour un champ que la requête ne contient pas.
    expect(erreurs(AbsenceSchema, absence({ dateDebut: null, dateFin: null }))).toEqual({
      dateDebut: ['La date de début est invalide ou absente.'],
      dateFin: ['La date de fin est invalide ou absente.'],
    })
  })

  it('signale une date de début illisible en français', () => {
    expect(erreurs(AbsenceSchema, absence({ dateDebut: '' })).dateDebut).toEqual([
      'La date de début est invalide ou absente.',
    ])
  })
})

describe('ModificationAbsenceSchema', () => {
  it('accepte une période cohérente et convertit un motif vide en null', () => {
    const resultat = ModificationAbsenceSchema.safeParse({
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      motif: '   ',
    })
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.motif).toBeNull()
  })

  it('refuse une fin antérieure au début', () => {
    expect(
      erreurs(ModificationAbsenceSchema, {
        dateDebut: '2026-03-31',
        dateFin: '2026-03-01',
        motif: '',
      })
    ).toEqual({ dateFin: ['La date de fin ne peut pas précéder la date de début.'] })
  })

  it('exige les deux dates', () => {
    expect(erreurs(ModificationAbsenceSchema, { dateDebut: '', dateFin: '', motif: '' })).toEqual({
      dateDebut: ['La date de début est invalide ou absente.'],
      dateFin: ['La date de fin est invalide ou absente.'],
    })
  })
})
