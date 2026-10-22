import { describe, expect, it } from 'vitest'
import { filtresVides } from './filtres'
import { lireFiltres } from './lireFiltres'
import { adresseListe, valeursDeFormulaire, versParametres } from './versParametres'

describe('versParametres', () => {
  it('ne produit aucun paramètre quand il n’y a aucun filtre', () => {
    expect(versParametres(filtresVides()).toString()).toBe('')
    expect(adresseListe(filtresVides())).toBe('/enseignants')
  })

  it('n’écrit que ce qui diffère de l’état par défaut', () => {
    const filtres = { ...filtresVides(), sexe: 'F' as const, tri: 'grade' as const }
    expect(versParametres(filtres).toString()).toBe('sexe=F&trier=grade')
  })

  it('n’écrit pas la page 1, écrit les suivantes', () => {
    expect(versParametres({ ...filtresVides(), page: 1 }).has('page')).toBe(false)
    expect(versParametres({ ...filtresVides(), page: 4 }).get('page')).toBe('4')
  })

  it('écrit les listes en paramètres répétés, dans l’ordre du référentiel', () => {
    const filtres = lireFiltres({ statut: ['RETRAITE', 'ACTIF'] })
    expect(versParametres(filtres).getAll('statut')).toEqual(['ACTIF', 'RETRAITE'])
  })

  it('écrit les dates au format AAAA-MM-JJ', () => {
    const filtres = lireFiltres({ naissanceDu: '1970-03-01', naissanceAnnee: '1970' })
    expect(versParametres(filtres).toString()).toBe('naissanceAnnee=1970&naissanceDu=1970-03-01')
  })

  it('encode une recherche avec accents et espaces', () => {
    const filtres = { ...filtresVides(), recherche: 'Ndé Alice' }
    expect(adresseListe(filtres)).toBe('/enseignants?recherche=Nd%C3%A9+Alice')
  })

  it('deux adresses équivalentes donnent le même filtre, donc la même adresse', () => {
    const a = lireFiltres({ grade: 'ASSISTANT,PROFESSEUR', sexe: 'F' })
    const b = lireFiltres({ sexe: 'F', grade: ['PROFESSEUR', 'ASSISTANT', 'PROFESSEUR'] })
    expect(adresseListe(a)).toBe(adresseListe(b))
  })
})

describe('valeursDeFormulaire', () => {
  it('donne une liste de valeurs par paramètre, sans la page', () => {
    const filtres = lireFiltres({
      statut: ['ACTIF', 'RETRAITE'],
      sexe: 'F',
      page: '3',
      trier: 'grade',
    })
    expect(valeursDeFormulaire(filtres)).toEqual({
      statut: ['ACTIF', 'RETRAITE'],
      sexe: ['F'],
      trier: ['grade'],
    })
  })

  it('est vide sans filtre', () => {
    expect(valeursDeFormulaire(filtresVides())).toEqual({})
  })
})
