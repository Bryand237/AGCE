import { describe, expect, it } from 'vitest'
import {
  PositionProposeeSchema,
  RejetRapportSchema,
  SelectionEnseignantSchema,
  ValidationRapportSchema,
} from './rapport-avancement'

function erreurs(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } },
  entree: unknown
) {
  const resultat = schema.safeParse(entree) as
    | { success: true }
    | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } }
  return resultat.success ? {} : resultat.error.flatten().fieldErrors
}

describe('ValidationRapportSchema', () => {
  const complete = { dateValidation: '2026-01-10', auteurValidation: 'Le Recteur' }

  it('lit la date, l’auteur et la liste des exclusions confirmées', () => {
    const resultat = ValidationRapportSchema.safeParse({
      ...complete,
      exclusionsConfirmees: 'ens-2, ens-3 ,,ens-4',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data).toEqual({
        dateValidation: new Date('2026-01-10'),
        auteurValidation: 'Le Recteur',
        exclusionsConfirmees: ['ens-2', 'ens-3', 'ens-4'],
      })
    }
  })

  it('sans liste (champ absent ou vide), aucune exclusion n’est confirmée', () => {
    for (const exclusionsConfirmees of [undefined, '', ' , ']) {
      const resultat = ValidationRapportSchema.safeParse({ ...complete, exclusionsConfirmees })
      expect(resultat.success).toBe(true)
      if (resultat.success) expect(resultat.data.exclusionsConfirmees).toEqual([])
    }
  })

  it('nomme la date et l’auteur manquants ; une date absente n’est pas le 01/01/1970', () => {
    expect(erreurs(ValidationRapportSchema, {})).toEqual({
      dateValidation: ['La date de validation est invalide ou absente.'],
      auteurValidation: ["L'auteur de la validation est obligatoire"],
    })
    expect(
      erreurs(ValidationRapportSchema, { dateValidation: null, auteurValidation: '  ' })
    ).toEqual({
      dateValidation: ['La date de validation est invalide ou absente.'],
      auteurValidation: ["L'auteur de la validation est obligatoire"],
    })
  })
})

describe('SelectionEnseignantSchema, PositionProposeeSchema, RejetRapportSchema', () => {
  it.each<[Parameters<typeof erreurs>[0], string, string]>([
    [SelectionEnseignantSchema, 'enseignantId', 'Veuillez sélectionner un enseignant.'],
    [
      PositionProposeeSchema,
      'positionProposeeId',
      'Veuillez choisir une position proposée valide.',
    ],
    [RejetRapportSchema, 'motif', 'Le motif du rejet est obligatoire.'],
  ])(
    '%#: un champ vide, absent ou réduit à des espaces est refusé avec le même message',
    (schema, champ, message) => {
      for (const entree of [{ [champ]: '' }, {}, { [champ]: '   ' }]) {
        expect(erreurs(schema, entree)).toEqual({ [champ]: [message] })
      }
    }
  )

  it('retire les espaces autour de la valeur saisie', () => {
    expect(RejetRapportSchema.parse({ motif: '  Pièces manquantes ' })).toEqual({
      motif: 'Pièces manquantes',
    })
    expect(SelectionEnseignantSchema.parse({ enseignantId: ' ens-1 ' })).toEqual({
      enseignantId: 'ens-1',
    })
  })
})
