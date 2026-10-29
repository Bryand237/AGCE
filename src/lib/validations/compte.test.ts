import { describe, expect, it } from 'vitest'
import { ModificationIdentifiantsSchema, RetablissementIdentifiantsSchema } from './compte'

const SAISIE = { motDePasseActuel: 'ancien', nomUtilisateur: 'MBALA' }

function erreurs(saisie: Record<string, unknown>) {
  const resultat = ModificationIdentifiantsSchema.safeParse(saisie)
  return resultat.success ? null : resultat.error.flatten().fieldErrors
}

describe('ModificationIdentifiantsSchema', () => {
  it('accepte un identifiant seul : le mot de passe vide veut dire « ne pas le changer »', () => {
    const resultat = ModificationIdentifiantsSchema.safeParse({
      ...SAISIE,
      nouveauMotDePasse: '',
      confirmation: '',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.nouveauMotDePasse).toBeUndefined()
      expect(resultat.data.confirmation).toBeUndefined()
    }
  })

  it('retire les espaces autour de l’identifiant, pas autour du mot de passe', () => {
    const resultat = ModificationIdentifiantsSchema.safeParse({
      ...SAISIE,
      nomUtilisateur: '  MBALA  ',
      nouveauMotDePasse: ' mot de passe ',
      confirmation: ' mot de passe ',
    })

    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.nomUtilisateur).toBe('MBALA')
      expect(resultat.data.nouveauMotDePasse).toBe(' mot de passe ')
    }
  })

  it('exige le mot de passe actuel', () => {
    expect(erreurs({ nomUtilisateur: 'MBALA' })?.motDePasseActuel).toBeDefined()
    expect(erreurs({ ...SAISIE, motDePasseActuel: '' })?.motDePasseActuel).toEqual([
      'Saisissez votre mot de passe actuel.',
    ])
  })

  it.each([
    ['', /au moins 3 caractères/],
    ['ab', /au moins 3 caractères/],
    ['a'.repeat(51), /50 caractères/],
    ['mon identifiant', /lettres, des chiffres/],
    ['<script>', /lettres, des chiffres/],
  ])('refuse l’identifiant %j', (nomUtilisateur, message) => {
    expect(erreurs({ ...SAISIE, nomUtilisateur })?.nomUtilisateur?.[0]).toMatch(message)
  })

  it.each(['MBALA', 'dr.mbala', 'a_b-c', 'abc@ucac.cm', 'Éloïse2'])(
    'accepte l’identifiant %j',
    (nomUtilisateur) => {
      expect(erreurs({ ...SAISIE, nomUtilisateur })).toBeNull()
    }
  )

  it('refuse un nouveau mot de passe trop court', () => {
    expect(
      erreurs({ ...SAISIE, nouveauMotDePasse: 'court', confirmation: 'court' })?.nouveauMotDePasse
    ).toEqual(['Le mot de passe doit compter au moins 8 caractères.'])
  })

  it('refuse un mot de passe de plus de 72 octets : bcrypt ignorerait la fin', () => {
    const long = 'é'.repeat(37) // 37 caractères, 74 octets
    expect(
      erreurs({ ...SAISIE, nouveauMotDePasse: long, confirmation: long })?.nouveauMotDePasse?.[0]
    ).toMatch(/trop long/)
    const limite = 'é'.repeat(36) // 72 octets
    expect(erreurs({ ...SAISIE, nouveauMotDePasse: limite, confirmation: limite })).toBeNull()
  })

  it('refuse une confirmation différente du nouveau mot de passe', () => {
    expect(
      erreurs({ ...SAISIE, nouveauMotDePasse: 'mot-de-passe-9', confirmation: 'mot-de-passe-8' })
        ?.confirmation
    ).toEqual(['La confirmation est différente du nouveau mot de passe.'])
  })

  it('refuse une confirmation seule : le nouveau mot de passe a été oublié', () => {
    expect(erreurs({ ...SAISIE, confirmation: 'mot-de-passe-9' })?.nouveauMotDePasse).toEqual([
      'Saisissez le nouveau mot de passe, ou videz aussi la confirmation.',
    ])
  })
})

describe('RetablissementIdentifiantsSchema', () => {
  it('exige le mot de passe actuel', () => {
    expect(RetablissementIdentifiantsSchema.safeParse({}).success).toBe(false)
    expect(RetablissementIdentifiantsSchema.safeParse({ motDePasseActuel: '' }).success).toBe(false)
    expect(RetablissementIdentifiantsSchema.safeParse({ motDePasseActuel: 'x' }).success).toBe(true)
  })
})
