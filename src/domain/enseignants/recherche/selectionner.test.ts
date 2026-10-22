import { describe, expect, it } from 'vitest'
import { filtresVides } from './filtres'
import { lireFiltres } from './lireFiltres'
import { avecSituation, selectionnerDossiers } from './selectionner'
import { GRILLE_DE_TEST, dossierDeTest, jour } from './dossiersDeTest'

const AUJOURDHUI = jour('2026-10-20')

describe('avecSituation', () => {
  it('calcule la situation de chaque dossier à partir de la grille', () => {
    const [ligne] = avecSituation(
      [dossierDeTest({ dateNaissance: jour('1964-09-24'), dateEffetEchelon: jour('2024-07-01') })],
      GRILLE_DE_TEST
    )
    expect(ligne?.situation.dateRetraite).toEqual(jour('2029-09-24'))
    expect(ligne?.situation.dateProchainAvancement).toEqual(jour('2026-07-01'))
  })
})

describe('selectionnerDossiers', () => {
  const dossiers = [
    dossierDeTest({ nom: 'ABEGA', grade: 'ASSISTANT', sexe: 'M', statut: 'ACTIF' }),
    dossierDeTest({ nom: 'BIYA', grade: 'PROFESSEUR', sexe: 'F', statut: 'ACTIF' }),
    dossierDeTest({ nom: 'CHIROMA', grade: 'PROFESSEUR', sexe: 'F', statut: 'RETRAITE' }),
    dossierDeTest({ nom: 'DJOUKAM', grade: 'CHARGE_DE_COURS', sexe: 'M', statut: 'TRANSFERE' }),
  ]
  const noms = (filtres = filtresVides()) =>
    selectionnerDossiers(dossiers, filtres, GRILLE_DE_TEST, AUJOURDHUI).map((l) => l.dossier.nom)

  it('sans filtre : tous, triés par nom', () => {
    expect(noms()).toEqual(['ABEGA', 'BIYA', 'CHIROMA', 'DJOUKAM'])
  })

  it('applique les filtres puis le tri demandé', () => {
    expect(noms(lireFiltres({ sexe: 'F', trier: 'nom', ordre: 'desc' }))).toEqual([
      'CHIROMA',
      'BIYA',
    ])
    expect(noms(lireFiltres({ statut: ['ACTIF'], trier: 'grade' }))).toEqual(['BIYA', 'ABEGA'])
  })

  it('combine plusieurs critères', () => {
    expect(noms(lireFiltres({ sexe: 'F', statut: 'ACTIF' }))).toEqual(['BIYA'])
  })

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(noms(lireFiltres({ recherche: 'personne' }))).toEqual([])
  })

  it('ne modifie pas la liste de dossiers reçue', () => {
    const avant = dossiers.map((d) => d.nom)
    selectionnerDossiers(
      dossiers,
      lireFiltres({ trier: 'grade', ordre: 'desc' }),
      GRILLE_DE_TEST,
      AUJOURDHUI
    )
    expect(dossiers.map((d) => d.nom)).toEqual(avant)
  })

  it('« passée » et « à venir » suivent le jour donné, pas l’horloge', () => {
    const unActif = [dossierDeTest({ nom: 'A', dateNaissance: jour('1962-05-10') })]
    const filtres = lireFiltres({ retraiteEcheance: 'passee' })
    // retraite le 10/05/2027
    expect(selectionnerDossiers(unActif, filtres, GRILLE_DE_TEST, jour('2027-05-09'))).toHaveLength(
      0
    )
    expect(selectionnerDossiers(unActif, filtres, GRILLE_DE_TEST, jour('2027-05-10'))).toHaveLength(
      1
    )
  })
})
