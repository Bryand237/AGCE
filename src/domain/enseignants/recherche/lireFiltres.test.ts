import { describe, expect, it } from 'vitest'
import { filtresVides } from './filtres'
import { lireFiltres, parametresDepuisUrl } from './lireFiltres'
import { versParametres } from './versParametres'
import { jour } from './dossiersDeTest'

describe('lireFiltres', () => {
  it('sans paramètre : aucun filtre, tri par nom, première page', () => {
    expect(lireFiltres({})).toEqual(filtresVides())
  })

  it('lit la recherche libre en compactant les espaces', () => {
    expect(lireFiltres({ recherche: '  Alice   Mbarga ' }).recherche).toBe('Alice Mbarga')
  })

  it('coupe une recherche démesurée', () => {
    expect(lireFiltres({ recherche: 'a'.repeat(500) }).recherche).toHaveLength(100)
  })

  it('lit plusieurs statuts et grades, répétés ou séparés par des virgules, sans doublon', () => {
    const filtres = lireFiltres({
      statut: ['RETRAITE', 'ACTIF', 'ACTIF'],
      grade: 'ASSISTANT,PROFESSEUR',
    })
    expect(filtres.statuts).toEqual(['ACTIF', 'RETRAITE'])
    expect(filtres.grades).toEqual(['PROFESSEUR', 'ASSISTANT'])
  })

  it('ignore les statuts, grades et genres inconnus', () => {
    const filtres = lireFiltres({ statut: 'DECEDE', grade: 'DOYEN', sexe: 'X' })
    expect(filtres.statuts).toEqual([])
    expect(filtres.grades).toEqual([])
    expect(filtres.sexe).toBeUndefined()
  })

  it('lit le genre, les identifiants et les oui/non', () => {
    const filtres = lireFiltres({
      sexe: 'F',
      etablissement: 'abc-123',
      departement: 'dep_1',
      region: 'r1',
      origine: 'o1',
      resident: 'oui',
      collaboration: 'non',
      responsabilite: 'OUI',
    })
    expect(filtres).toMatchObject({
      sexe: 'F',
      etablissementId: 'abc-123',
      departementId: 'dep_1',
      regionId: 'r1',
      departementOrigineId: 'o1',
      resident: true,
      collaboration: false,
      responsabilite: true,
    })
  })

  it('ignore un identifiant suspect et un oui/non invalide', () => {
    const filtres = lireFiltres({
      etablissement: "x'; DROP TABLE",
      departement: '../../etc',
      resident: 'peut-être',
    })
    expect(filtres.etablissementId).toBeUndefined()
    expect(filtres.departementId).toBeUndefined()
    expect(filtres.resident).toBeUndefined()
  })

  it('lit classe, échelon et bornes d’indice, et ignore le reste', () => {
    expect(
      lireFiltres({ classe: '2', echelon: '3', indiceMin: '940', indiceMax: '1200' })
    ).toMatchObject({
      classe: 2,
      echelon: 3,
      indiceMin: 940,
      indiceMax: 1200,
    })
    const invalide = lireFiltres({
      classe: 'deux',
      echelon: '-1',
      indiceMin: '12.5',
      indiceMax: '99999999',
    })
    expect(invalide.classe).toBeUndefined()
    expect(invalide.echelon).toBeUndefined()
    expect(invalide.indiceMin).toBeUndefined()
    expect(invalide.indiceMax).toBeUndefined()
  })

  it('lit les critères de date : année, du, au', () => {
    const filtres = lireFiltres({
      naissanceAnnee: '1970',
      naissanceDu: '1970-03-01',
      naissanceAu: '1970-12-31',
      priseServiceDu: '2000-01-01',
    })
    expect(filtres.naissance).toEqual({
      annee: 1970,
      du: jour('1970-03-01'),
      au: jour('1970-12-31'),
    })
    expect(filtres.priseService).toEqual({ du: jour('2000-01-01') })
  })

  it.each([
    ['année absurde', { naissanceAnnee: '12' }],
    ['année hors limites', { naissanceAnnee: '3000' }],
    ['année non numérique', { naissanceAnnee: 'abc' }],
    ['date inexistante', { naissanceDu: '2027-02-30' }],
    ['date au mauvais format', { naissanceDu: '15/03/1970' }],
    ['date hors limites', { naissanceAu: '0850-01-01' }],
  ])('ignore un critère de date invalide : %s', (_nom, parametres) => {
    expect(lireFiltres(parametres).naissance).toEqual({})
  })

  it('lit le tri (nom de paramètre « trier », celui de l’ancienne liste) et l’ordre', () => {
    expect(lireFiltres({ trier: 'grade' }).tri).toBe('grade')
    expect(lireFiltres({ trier: 'statut', ordre: 'desc' })).toMatchObject({
      tri: 'statut',
      ordre: 'desc',
    })
    expect(lireFiltres({ trier: 'n_importe_quoi', ordre: 'sideways' })).toMatchObject({
      tri: 'nom',
      ordre: 'asc',
    })
  })

  it.each([
    ['abc', 1],
    ['', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['3', 3],
    ['  4 ', 4],
  ])('page « %s » donne la page %i (D5 : plus de NaN)', (texte, attendu) => {
    expect(lireFiltres({ page: texte }).page).toBe(attendu)
  })

  it('ne lève jamais d’erreur, quelles que soient les valeurs', () => {
    const farfelu = {
      recherche: ['a', 'b'],
      statut: [',', ',,'],
      page: ['x', '2'],
      naissanceAnnee: ['1970', '1980'],
      classe: [],
    }
    expect(() => lireFiltres(farfelu)).not.toThrow()
  })

  it('prend la première valeur quand un paramètre à valeur unique est répété', () => {
    expect(lireFiltres({ sexe: ['F', 'M'] }).sexe).toBe('F')
    expect(lireFiltres({ naissanceAnnee: ['1970', '1980'] }).naissance.annee).toBe(1970)
  })
})

describe('parametresDepuisUrl', () => {
  it('garde une valeur unique telle quelle et regroupe les valeurs répétées', () => {
    const parametres = parametresDepuisUrl(
      new URLSearchParams('sexe=F&statut=ACTIF&statut=RETRAITE')
    )
    expect(parametres).toEqual({ sexe: 'F', statut: ['ACTIF', 'RETRAITE'] })
  })
})

describe('lireFiltres ∘ versParametres', () => {
  it('relit exactement ce qui a été écrit', () => {
    const filtres = lireFiltres({
      recherche: 'alice mbarga',
      statut: ['ACTIF', 'RETRAITE'],
      grade: ['PROFESSEUR'],
      sexe: 'F',
      etablissement: 'e1',
      departement: 'd1',
      region: 'r1',
      origine: 'o1',
      resident: 'oui',
      collaboration: 'non',
      responsabilite: 'oui',
      classe: '2',
      echelon: '1',
      indiceMin: '900',
      indiceMax: '1300',
      naissanceAnnee: '1970',
      naissanceDu: '1970-01-01',
      priseServiceAu: '2010-12-31',
      trier: 'retraite',
      ordre: 'desc',
      page: '3',
    })
    expect(lireFiltres(parametresDepuisUrl(versParametres(filtres)))).toEqual(filtres)
  })
})

describe('lireFiltres — retraite et avancement', () => {
  it('lit l’échéance, l’année et la plage de chaque critère', () => {
    const filtres = lireFiltres({
      retraiteEcheance: 'future',
      retraiteAnnee: '2028',
      retraiteDu: '2028-03-01',
      avancementEcheance: 'passee',
      avancementAu: '2026-12-31',
    })
    expect(filtres.retraite).toEqual({ echeance: 'future', annee: 2028, du: jour('2028-03-01') })
    expect(filtres.avancement).toEqual({ echeance: 'passee', au: jour('2026-12-31') })
  })

  it('ignore une échéance inconnue ou une date invalide, sans lever d’erreur', () => {
    const filtres = lireFiltres({
      retraiteEcheance: 'demain',
      retraiteAnnee: 'abc',
      avancementDu: '2026-02-30',
    })
    expect(filtres.retraite).toEqual({})
    expect(filtres.avancement).toEqual({})
  })

  it('accepte « avancement » comme clé de tri', () => {
    expect(lireFiltres({ trier: 'avancement' }).tri).toBe('avancement')
  })

  it('relit exactement ce que versParametres écrit', () => {
    const filtres = lireFiltres({
      retraiteEcheance: 'passee',
      retraiteAnnee: '2025',
      avancementEcheance: 'future',
      avancementDu: '2027-01-01',
      avancementAu: '2027-12-31',
      trier: 'avancement',
    })
    expect(lireFiltres(parametresDepuisUrl(versParametres(filtres)))).toEqual(filtres)
  })
})
