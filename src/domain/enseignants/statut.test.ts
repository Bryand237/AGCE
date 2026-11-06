import { describe, expect, it } from 'vitest'
import { STATUTS_ENSEIGNANT } from './dossier'
import { dateDeFinAffichee, erreurChangementStatut } from './statut'

describe('erreurChangementStatut', () => {
  it('permet à un enseignant actif d’être transféré ou retraité', () => {
    expect(erreurChangementStatut('ACTIF', 'transferer')).toBeUndefined()
    expect(erreurChangementStatut('ACTIF', 'retraiter')).toBeUndefined()
  })

  it('permet de réactiver un transféré et un retraité', () => {
    expect(erreurChangementStatut('TRANSFERE', 'reactiver')).toBeUndefined()
    expect(erreurChangementStatut('RETRAITE', 'reactiver')).toBeUndefined()
  })

  it('refuse de réactiver un enseignant déjà actif', () => {
    expect(erreurChangementStatut('ACTIF', 'reactiver')).toBe('Cet enseignant est déjà actif.')
  })

  it('refuse de transférer un enseignant déjà transféré, ou de retraiter un retraité', () => {
    expect(erreurChangementStatut('TRANSFERE', 'transferer')).toBe(
      'Cet enseignant est déjà transféré.'
    )
    expect(erreurChangementStatut('RETRAITE', 'retraiter')).toBe(
      'Cet enseignant est déjà retraité.'
    )
  })

  it('refuse de passer directement de retraité à transféré, en indiquant la marche à suivre', () => {
    expect(erreurChangementStatut('RETRAITE', 'transferer')).toBe(
      "Cet enseignant est retraité : il ne peut pas être marqué transféré. Réactivez-le d'abord si son statut est une erreur."
    )
  })

  it('refuse de passer directement de transféré à retraité', () => {
    expect(erreurChangementStatut('TRANSFERE', 'retraiter')).toBe(
      "Cet enseignant est transféré : il ne peut pas être marqué retraité. Réactivez-le d'abord si son statut est une erreur."
    )
  })

  it('autorise exactement les transitions du tableau, et aucune autre', () => {
    const permises: Array<[string, string]> = [
      ['ACTIF', 'transferer'],
      ['ACTIF', 'retraiter'],
      ['TRANSFERE', 'reactiver'],
      ['RETRAITE', 'reactiver'],
    ]
    const observees: Array<[string, string]> = []
    for (const statut of STATUTS_ENSEIGNANT) {
      for (const changement of ['transferer', 'retraiter', 'reactiver'] as const) {
        if (erreurChangementStatut(statut, changement) === undefined) {
          observees.push([statut, changement])
        }
      }
    }
    expect(observees).toEqual(permises)
  })
})

describe('dateDeFinAffichee', () => {
  const RETRAITE_PREVUE = new Date('2046-03-20T00:00:00Z')
  const FIN = new Date('2024-06-30T00:00:00Z')

  it('affiche la retraite prévue (calculée) pour un enseignant actif', () => {
    expect(dateDeFinAffichee('ACTIF', RETRAITE_PREVUE, null)).toEqual({
      libelle: 'Retraite prévue',
      date: RETRAITE_PREVUE,
    })
  })

  it('affiche la date de retraite enregistrée, et non la date calculée, pour un retraité', () => {
    expect(dateDeFinAffichee('RETRAITE', RETRAITE_PREVUE, FIN)).toEqual({
      libelle: 'Date de retraite',
      date: FIN,
    })
  })

  it('affiche la date de transfert enregistrée pour un transféré', () => {
    expect(dateDeFinAffichee('TRANSFERE', RETRAITE_PREVUE, FIN)).toEqual({
      libelle: 'Date de transfert',
      date: FIN,
    })
  })

  it('ne remplace jamais une date de fin absente par la date calculée', () => {
    expect(dateDeFinAffichee('RETRAITE', RETRAITE_PREVUE, null).date).toBeNull()
    expect(dateDeFinAffichee('TRANSFERE', RETRAITE_PREVUE, null).date).toBeNull()
  })
})
