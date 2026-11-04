import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  AbsenceSchema,
  ModificationAbsenceSchema,
  ValidationAbsenceSchema,
  ValidationAttestationSchema,
} from './absence'
import { TYPES_ABSENCE_SAISISSABLES } from '@/domain/absences/typesAbsence'

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

function erreurs(schema: z.ZodTypeAny, entree: unknown): Record<string, string[] | undefined> {
  const resultat = schema.safeParse(entree)
  return resultat.success ? {} : resultat.error.flatten().fieldErrors
}

describe('AbsenceSchema : types', () => {
  it.each(TYPES_ABSENCE_SAISISSABLES)('accepte le type %s', (type) => {
    expect(AbsenceSchema.safeParse(absence({ type })).success).toBe(true)
  })

  it.each(['CONGE_ADMINISTRATIF', 'AUTRE', 'VACANCES', ''])(
    'refuse le type « %s », sans formulaire ni gabarit',
    (type) => {
      expect(erreurs(AbsenceSchema, absence({ type }))).toEqual({
        type: ["Le type d'absence est obligatoire."],
      })
    }
  )
})

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

describe('ValidationAbsenceSchema', () => {
  const complete = { dateValidation: '2026-10-01', auteurValidation: 'Le Recteur' }

  it('accepte la validation sans courrier : les champs facultatifs valent null', () => {
    const resultat = ValidationAbsenceSchema.safeParse(complete)

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data).toEqual({
        dateValidation: new Date('2026-10-01'),
        auteurValidation: 'Le Recteur',
        referenceCorrespondance: null,
        dateCorrespondance: null,
        dateDemandeInteressee: null,
      })
    }
  })

  it('traite des champs vides comme absents', () => {
    const resultat = ValidationAbsenceSchema.safeParse({
      ...complete,
      referenceCorrespondance: '   ',
      dateCorrespondance: '',
      dateDemandeInteressee: '',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.referenceCorrespondance).toBeNull()
      expect(resultat.data.dateCorrespondance).toBeNull()
      expect(resultat.data.dateDemandeInteressee).toBeNull()
    }
  })

  it('lit le courrier saisi : référence sans espaces, dates à minuit UTC', () => {
    const resultat = ValidationAbsenceSchema.safeParse({
      ...complete,
      referenceCorrespondance: ' N° 26-114 ',
      dateCorrespondance: '2026-05-05',
      dateDemandeInteressee: '2026-04-20',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.referenceCorrespondance).toBe('N° 26-114')
      expect(resultat.data.dateCorrespondance).toEqual(new Date('2026-05-05'))
      expect(resultat.data.dateDemandeInteressee).toEqual(new Date('2026-04-20'))
    }
  })

  it('nomme chaque champ obligatoire manquant (champs absents de la requête compris)', () => {
    expect(erreurs(ValidationAbsenceSchema, {})).toEqual({
      dateValidation: ['La date de validation est invalide ou absente.'],
      auteurValidation: ["L'auteur de la validation est obligatoire"],
    })
  })

  it('refuse une date de courrier illisible au lieu de l’ignorer', () => {
    expect(
      erreurs(ValidationAbsenceSchema, { ...complete, dateCorrespondance: 'le 5 mai' })
    ).toEqual({ dateCorrespondance: ['La date de la correspondance est invalide ou absente.'] })
    expect(
      erreurs(ValidationAbsenceSchema, { ...complete, dateDemandeInteressee: 'hier' })
    ).toEqual({
      dateDemandeInteressee: ["La date de la demande de l'intéressé(e) est invalide ou absente."],
    })
  })
})

describe('ValidationAttestationSchema', () => {
  it('accepte une attestation complète et retire les espaces autour du numéro et de l’auteur', () => {
    const resultat = ValidationAttestationSchema.safeParse({
      numeroDecision: ' 12/26 ',
      dateValidation: '2026-10-01',
      auteurValidation: ' Le Recteur ',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data).toEqual({
        numeroDecision: '12/26',
        dateValidation: new Date('2026-10-01'),
        auteurValidation: 'Le Recteur',
      })
    }
  })

  it('nomme chaque champ manquant, y compris quand la requête ne le contient pas', () => {
    expect(erreurs(ValidationAttestationSchema, {})).toEqual({
      numeroDecision: ['Le numéro de décision est obligatoire'],
      dateValidation: ['La date de validation est invalide ou absente.'],
      auteurValidation: ["L'auteur de la validation est obligatoire"],
    })
  })
})
