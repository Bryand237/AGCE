import { describe, expect, it } from 'vitest'
import { DepartementSchema, EtablissementSchema } from './etablissement'

const ETABLISSEMENT_ID = '3f2b8c1e-5a4d-4e6f-8a1b-2c3d4e5f6a7b'

describe('EtablissementSchema', () => {
  it('retire les espaces et met l’abréviation en majuscules', () => {
    const resultat = EtablissementSchema.safeParse({
      nom: '  Faculté des Sciences ',
      abreviation: ' fs ',
      type: 'FACULTE',
    })
    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.nom).toBe('Faculté des Sciences')
      expect(resultat.data.abreviation).toBe('FS')
    }
  })

  it('refuse un nom ou une abréviation réduits à des espaces', () => {
    const resultat = EtablissementSchema.safeParse({
      nom: '     ',
      abreviation: '   ',
      type: 'ECOLE',
    })
    expect(resultat.success).toBe(false)
    if (!resultat.success) {
      const champs = resultat.error.flatten().fieldErrors
      expect(champs.nom).toEqual(['Le nom est obligatoire'])
      expect(champs.abreviation).toEqual(["L'abréviation est obligatoire"])
    }
  })

  it('refuse une abréviation de plus de 15 caractères', () => {
    const resultat = EtablissementSchema.safeParse({
      nom: 'Faculté',
      abreviation: 'ABCDEFGHIJKLMNOP',
      type: 'ECOLE',
    })
    expect(resultat.success).toBe(false)
  })
})

describe('DepartementSchema', () => {
  it('retire les espaces et met l’abréviation en majuscules', () => {
    const resultat = DepartementSchema.safeParse({
      nom: ' Informatique ',
      abreviation: ' info ',
      etablissementId: ETABLISSEMENT_ID,
    })
    expect(resultat.success).toBe(true)
    if (resultat.success) {
      expect(resultat.data.nom).toBe('Informatique')
      expect(resultat.data.abreviation).toBe('INFO')
    }
  })

  it('refuse une abréviation réduite à des espaces ou trop longue', () => {
    const base = { nom: 'Informatique', etablissementId: ETABLISSEMENT_ID }
    expect(DepartementSchema.safeParse({ ...base, abreviation: '   ' }).success).toBe(false)
    expect(DepartementSchema.safeParse({ ...base, abreviation: 'A'.repeat(16) }).success).toBe(
      false
    )
  })

  it('signale un établissement invalide en français', () => {
    const resultat = DepartementSchema.safeParse({
      nom: 'Informatique',
      abreviation: 'INFO',
      etablissementId: 'abc',
    })
    expect(resultat.success).toBe(false)
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.etablissementId).toEqual([
        'Établissement invalide',
      ])
    }
  })
})
