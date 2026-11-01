import { describe, expect, it } from 'vitest'
import { IDENTIFIANT_MAX, MOT_DE_PASSE_CONNEXION_MAX, SaisieConnexionSchema } from './connexion'

const valide = { nomUtilisateur: 'mbala', motDePasse: 'secret', seSouvenir: null }

describe('SaisieConnexionSchema', () => {
  it('accepte un identifiant et un mot de passe', () => {
    const resultat = SaisieConnexionSchema.safeParse(valide)
    expect(resultat.success).toBe(true)
  })

  it('ne retouche ni l’identifiant ni le mot de passe (espaces compris)', () => {
    const resultat = SaisieConnexionSchema.parse({
      ...valide,
      nomUtilisateur: ' mbala ',
      motDePasse: ' secret ',
    })
    expect(resultat.nomUtilisateur).toBe(' mbala ')
    expect(resultat.motDePasse).toBe(' secret ')
  })

  it('refuse un champ absent : FormData.get() renvoie alors null', () => {
    expect(SaisieConnexionSchema.safeParse({ ...valide, nomUtilisateur: null }).success).toBe(false)
    expect(SaisieConnexionSchema.safeParse({ ...valide, motDePasse: null }).success).toBe(false)
  })

  it('refuse un champ vide', () => {
    expect(SaisieConnexionSchema.safeParse({ ...valide, nomUtilisateur: '' }).success).toBe(false)
    expect(SaisieConnexionSchema.safeParse({ ...valide, motDePasse: '' }).success).toBe(false)
  })

  it('refuse un fichier envoyé à la place d’un champ texte', () => {
    const fichier = new File(['x'], 'x.txt')
    expect(SaisieConnexionSchema.safeParse({ ...valide, nomUtilisateur: fichier }).success).toBe(
      false
    )
  })

  it('refuse un identifiant ou un mot de passe démesuré', () => {
    expect(
      SaisieConnexionSchema.safeParse({
        ...valide,
        nomUtilisateur: 'a'.repeat(IDENTIFIANT_MAX + 1),
      }).success
    ).toBe(false)
    expect(
      SaisieConnexionSchema.safeParse({
        ...valide,
        motDePasse: 'a'.repeat(MOT_DE_PASSE_CONNEXION_MAX + 1),
      }).success
    ).toBe(false)
    expect(
      SaisieConnexionSchema.safeParse({
        ...valide,
        nomUtilisateur: 'a'.repeat(IDENTIFIANT_MAX),
        motDePasse: 'a'.repeat(MOT_DE_PASSE_CONNEXION_MAX),
      }).success
    ).toBe(true)
  })

  it('lit la case « rester connecté » : cochée = « on », décochée = rien', () => {
    expect(SaisieConnexionSchema.parse({ ...valide, seSouvenir: 'on' }).seSouvenir).toBe(true)
    expect(SaisieConnexionSchema.parse({ ...valide, seSouvenir: null }).seSouvenir).toBe(false)
    expect(SaisieConnexionSchema.parse({ ...valide, seSouvenir: undefined }).seSouvenir).toBe(false)
    expect(SaisieConnexionSchema.parse({ ...valide, seSouvenir: 'autre' }).seSouvenir).toBe(false)
  })
})
