import { describe, expect, it } from 'vitest'
import { EnseignantSchema } from './enseignant'

const SAISIE = {
  matricule: '12345',
  nom: 'MBARGA',
  prenom: 'Alice',
  sexe: 'F',
  dateNaissance: '1988-03-20',
  lieuNaissance: 'Yaoundé',
  datePriseService: '2018-09-01',
  estResident: 'oui',
  contratCollaboration: 'non',
  departementId: '3f2b8c1e-5a4d-4e6f-8a1b-2c3d4e5f6a7b',
  positionActuelleId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  dateEffetEchelon: '2018-09-01',
}

function lire(surcharge: Record<string, unknown> = {}) {
  const resultat = EnseignantSchema.safeParse({ ...SAISIE, ...surcharge })
  if (!resultat.success) throw new Error(JSON.stringify(resultat.error.flatten().fieldErrors))
  return resultat.data
}

const CHAMPS_TEXTE = ['diplomePlusEleve', 'domaineRecherche', 'posteResponsabilite', 'telephone']

describe('EnseignantSchema : champs facultatifs', () => {
  it.each(CHAMPS_TEXTE)(
    '« %s » vidé vaut null, pour que la valeur enregistrée soit effacée',
    (champ) => {
      expect(lire({ [champ]: '' })[champ as 'telephone']).toBeNull()
      expect(lire({ [champ]: '   ' })[champ as 'telephone']).toBeNull()
    }
  )

  it.each(CHAMPS_TEXTE)('« %s » renseigné est gardé, sans espaces autour', (champ) => {
    expect(lire({ [champ]: '  Doctorat  ' })[champ as 'telephone']).toBe('Doctorat')
  })

  it.each(CHAMPS_TEXTE)(
    '« %s » absent de la requête reste undefined : rien n’est modifié',
    (champ) => {
      expect(lire()[champ as 'telephone']).toBeUndefined()
    }
  )

  it('un e-mail vidé vaut null, pas une chaîne vide', () => {
    expect(lire({ email: '' }).email).toBeNull()
    expect(lire({ email: '   ' }).email).toBeNull()
  })

  it('un e-mail valide est gardé, sans espaces autour ; absent, il reste undefined', () => {
    expect(lire({ email: ' alice@exemple.cm ' }).email).toBe('alice@exemple.cm')
    expect(lire().email).toBeUndefined()
  })

  it('un e-mail invalide est toujours refusé', () => {
    const resultat = EnseignantSchema.safeParse({ ...SAISIE, email: 'pas-un-courriel' })
    expect(resultat.success).toBe(false)
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.email).toEqual(['Adresse e-mail invalide.'])
    }
  })

  it('un département d’origine laissé sur « Non renseigné » vaut null', () => {
    expect(lire({ departementOrigineId: '' }).departementOrigineId).toBeNull()
  })
})
