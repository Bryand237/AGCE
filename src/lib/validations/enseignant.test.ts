import { describe, expect, it } from 'vitest'
import { EnseignantSchema } from './enseignant'

const DEPARTEMENT = '3f2b8c1e-5a4d-4e6f-8a1b-2c3d4e5f6a7b'
const POSITION = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
const ORIGINE = '123e4567-e89b-42d3-a456-426614174000'

/** Ce que le navigateur envoie réellement : des chaînes, y compris vides. */
function formulaire(surcharge: Record<string, unknown> = {}) {
  return {
    matricule: '12345',
    nom: 'MBARGA',
    prenom: 'Alice',
    sexe: 'F',
    dateNaissance: '1988-03-20',
    lieuNaissance: 'Yaoundé',
    diplomePlusEleve: '',
    domaineRecherche: '',
    datePriseService: '2018-09-01',
    estResident: 'oui',
    contratCollaboration: 'non',
    posteResponsabilite: '',
    telephone: '',
    email: '',
    departementId: DEPARTEMENT,
    departementOrigineId: '',
    positionActuelleId: POSITION,
    dateEffetEchelon: '2018-09-01',
    ...surcharge,
  }
}

describe('EnseignantSchema — département d’origine', () => {
  it('accepte « Non renseigné » (chaîne vide) et le convertit en null', () => {
    const resultat = EnseignantSchema.safeParse(formulaire({ departementOrigineId: '' }))
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.departementOrigineId).toBeNull()
  })

  it('accepte l’absence du champ', () => {
    const entree: Record<string, unknown> = formulaire()
    delete entree.departementOrigineId
    const resultat = EnseignantSchema.safeParse(entree)
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.departementOrigineId).toBeNull()
  })

  it('conserve un identifiant valide', () => {
    const resultat = EnseignantSchema.safeParse(formulaire({ departementOrigineId: ORIGINE }))
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.departementOrigineId).toBe(ORIGINE)
  })

  it('refuse une valeur qui n’est pas un identifiant, avec un message en français', () => {
    const resultat = EnseignantSchema.safeParse(formulaire({ departementOrigineId: 'abc' }))
    expect(resultat.success).toBe(false)
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.departementOrigineId).toEqual([
        "Le département d'origine est invalide",
      ])
    }
  })

  it('ignore les champs inconnus envoyés par le formulaire (photo, removePhoto)', () => {
    const resultat = EnseignantSchema.safeParse(formulaire({ photo: {}, removePhoto: 'on' }))
    expect(resultat.success).toBe(true)
  })
})
