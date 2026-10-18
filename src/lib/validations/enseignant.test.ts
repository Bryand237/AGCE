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

function erreurs(entree: Record<string, unknown>): Record<string, string[] | undefined> {
  const resultat = EnseignantSchema.safeParse(entree)
  return resultat.success ? {} : resultat.error.flatten().fieldErrors
}

describe('EnseignantSchema — cohérence entre dates', () => {
  it('accepte un ensemble de dates cohérent', () => {
    expect(EnseignantSchema.safeParse(formulaire()).success).toBe(true)
  })

  it('refuse une naissance dans le futur (2099 saisi à la place de 1999)', () => {
    expect(erreurs(formulaire({ dateNaissance: '2099-01-01' })).dateNaissance).toEqual([
      'La date de naissance ne peut pas être dans le futur.',
    ])
  })

  it('refuse une prise de service antérieure à la naissance', () => {
    expect(
      erreurs(formulaire({ dateNaissance: '1990-05-01', datePriseService: '1985-09-01' }))
        .datePriseService
    ).toEqual(['La prise de service doit être postérieure à la date de naissance.'])
  })

  it('refuse une prise de service le jour même de la naissance', () => {
    expect(
      erreurs(formulaire({ dateNaissance: '1990-05-01', datePriseService: '1990-05-01' }))
        .datePriseService
    ).toBeDefined()
  })

  it('refuse une date d’effet d’échelon antérieure à la prise de service', () => {
    expect(
      erreurs(formulaire({ datePriseService: '2018-09-01', dateEffetEchelon: '2010-01-01' }))
        .dateEffetEchelon
    ).toEqual(["La date d'effet de l'échelon ne peut pas précéder la prise de service."])
  })

  it('accepte une date d’effet égale à la prise de service', () => {
    expect(
      EnseignantSchema.safeParse(
        formulaire({ datePriseService: '2018-09-01', dateEffetEchelon: '2018-09-01' })
      ).success
    ).toBe(true)
  })

  it('signale chaque incohérence sur son propre champ', () => {
    const champs = erreurs(
      formulaire({
        dateNaissance: '2099-01-01',
        datePriseService: '2018-09-01',
        dateEffetEchelon: '2010-01-01',
      })
    )
    expect(Object.keys(champs).sort()).toEqual(
      ['dateEffetEchelon', 'datePriseService', 'dateNaissance'].sort()
    )
  })

  it('n’annonce pas d’incohérence quand une date est illisible : seule celle-ci est signalée', () => {
    const champs = erreurs(formulaire({ dateNaissance: '' }))
    expect(champs.dateNaissance).toEqual(['La date de naissance est invalide ou absente.'])
    expect(champs.datePriseService).toBeUndefined()
  })
})

describe('EnseignantSchema — textes', () => {
  it.each(['matricule', 'nom', 'prenom', 'lieuNaissance'])(
    'refuse « %s » réduit à des espaces',
    (champ) => {
      expect(erreurs(formulaire({ [champ]: '   ' }))[champ]).toBeDefined()
    }
  )

  it('retire les espaces autour des textes obligatoires', () => {
    const resultat = EnseignantSchema.safeParse(
      formulaire({ matricule: '  12345 ', nom: ' MBARGA ' })
    )
    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.matricule).toBe('12345')
      expect(resultat.data.nom).toBe('MBARGA')
    }
  })

  it('donne un message propre au lieu de naissance vide', () => {
    expect(erreurs(formulaire({ lieuNaissance: '' })).lieuNaissance).toEqual([
      'Le lieu de naissance est obligatoire',
    ])
  })

  it('traite un champ facultatif réduit à des espaces comme absent', () => {
    const resultat = EnseignantSchema.safeParse(formulaire({ telephone: '   ' }))
    expect(resultat.success).toBe(true)
    if (resultat.success) expect(resultat.data.telephone).toBeUndefined()
  })

  it('refuse une adresse e-mail mal formée, avec un message en français', () => {
    expect(erreurs(formulaire({ email: 'pas-un-mail' })).email).toEqual([
      'Adresse e-mail invalide.',
    ])
  })

  it('accepte une adresse e-mail valide, vide ou réduite à des espaces', () => {
    expect(EnseignantSchema.safeParse(formulaire({ email: 'a.b@univ-ndere.cm' })).success).toBe(
      true
    )
    expect(EnseignantSchema.safeParse(formulaire({ email: '' })).success).toBe(true)
    expect(EnseignantSchema.safeParse(formulaire({ email: '   ' })).success).toBe(true)
  })

  it('demande un choix de sexe en français', () => {
    expect(erreurs(formulaire({ sexe: '' })).sexe).toEqual(['Le sexe est obligatoire.'])
  })
})
