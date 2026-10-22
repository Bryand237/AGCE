import { describe, expect, it } from 'vitest'
import { correspondAuxFiltres } from './correspond'
import { filtresVides } from './filtres'
import type { FiltresEnseignants } from './filtres'
import { dossierDeTest, jour } from './dossiersDeTest'

const avec = (surcharge: Partial<FiltresEnseignants>): FiltresEnseignants => ({
  ...filtresVides(),
  ...surcharge,
})

describe('correspondAuxFiltres — sans filtre', () => {
  it('retient tous les dossiers, quel que soit leur statut', () => {
    for (const statut of ['ACTIF', 'TRANSFERE', 'RETRAITE'] as const) {
      expect(correspondAuxFiltres(dossierDeTest({ statut }), filtresVides())).toBe(true)
    }
  })
})

describe('correspondAuxFiltres — identité', () => {
  it('statut : un ou plusieurs', () => {
    const retraite = dossierDeTest({ statut: 'RETRAITE' })
    expect(correspondAuxFiltres(retraite, avec({ statuts: ['ACTIF'] }))).toBe(false)
    expect(correspondAuxFiltres(retraite, avec({ statuts: ['ACTIF', 'RETRAITE'] }))).toBe(true)
  })

  it('grade : un ou plusieurs', () => {
    const assistant = dossierDeTest({ grade: 'ASSISTANT' })
    expect(correspondAuxFiltres(assistant, avec({ grades: ['PROFESSEUR'] }))).toBe(false)
    expect(correspondAuxFiltres(assistant, avec({ grades: ['PROFESSEUR', 'ASSISTANT'] }))).toBe(
      true
    )
  })

  it('genre', () => {
    expect(correspondAuxFiltres(dossierDeTest({ sexe: 'F' }), avec({ sexe: 'M' }))).toBe(false)
    expect(correspondAuxFiltres(dossierDeTest({ sexe: 'F' }), avec({ sexe: 'F' }))).toBe(true)
  })
})

describe('correspondAuxFiltres — affectation et origine', () => {
  const d = dossierDeTest()

  it('établissement et département d’affectation', () => {
    expect(correspondAuxFiltres(d, avec({ etablissementId: 'etab-falsh' }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ etablissementId: 'autre' }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ departementId: 'dep-geo' }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ departementId: 'autre' }))).toBe(false)
  })

  it('région et département d’origine', () => {
    expect(correspondAuxFiltres(d, avec({ regionId: 'reg-ouest' }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ regionId: 'autre' }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ departementOrigineId: 'orig-bamboutos' }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ departementOrigineId: 'autre' }))).toBe(false)
  })

  it('une origine non renseignée ne correspond à aucun filtre d’origine', () => {
    const sansOrigine = dossierDeTest({ departementOrigine: null, regionOrigine: null })
    expect(correspondAuxFiltres(sansOrigine, avec({ regionId: 'reg-ouest' }))).toBe(false)
    expect(
      correspondAuxFiltres(sansOrigine, avec({ departementOrigineId: 'orig-bamboutos' }))
    ).toBe(false)
    expect(correspondAuxFiltres(sansOrigine, filtresVides())).toBe(true)
  })
})

describe('correspondAuxFiltres — indicateurs', () => {
  it('résident et contrat de collaboration', () => {
    const d = dossierDeTest({ estResident: false, contratCollaboration: true })
    expect(correspondAuxFiltres(d, avec({ resident: false }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ resident: true }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ collaboration: true }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ collaboration: false }))).toBe(false)
  })

  it('poste de responsabilité : vide ou espaces = aucun poste', () => {
    const avecPoste = dossierDeTest({ posteResponsabilite: 'Chef de département' })
    const vide = dossierDeTest({ posteResponsabilite: '   ' })
    const nul = dossierDeTest({ posteResponsabilite: null })
    expect(correspondAuxFiltres(avecPoste, avec({ responsabilite: true }))).toBe(true)
    expect(correspondAuxFiltres(vide, avec({ responsabilite: true }))).toBe(false)
    expect(correspondAuxFiltres(vide, avec({ responsabilite: false }))).toBe(true)
    expect(correspondAuxFiltres(nul, avec({ responsabilite: false }))).toBe(true)
  })
})

describe('correspondAuxFiltres — classe, échelon, indice', () => {
  const d = dossierDeTest({
    position: {
      grade: 'PROFESSEUR',
      ordre: 3,
      classe: 1,
      echelon: 2,
      indice: 1240,
      sousCategorie: null,
    },
  })

  it('classe et échelon', () => {
    expect(correspondAuxFiltres(d, avec({ classe: 1 }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ classe: 2 }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ echelon: 2 }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ echelon: 3 }))).toBe(false)
  })

  it('indice : bornes incluses', () => {
    expect(correspondAuxFiltres(d, avec({ indiceMin: 1240 }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ indiceMin: 1241 }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ indiceMax: 1240 }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ indiceMax: 1239 }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ indiceMin: 1200, indiceMax: 1300 }))).toBe(true)
  })

  it('une position sans classe ni échelon (Stagiaire, Hors échelle…) ne correspond pas', () => {
    const horsEchelle = dossierDeTest({
      position: {
        grade: 'PROFESSEUR',
        ordre: 11,
        classe: null,
        echelon: null,
        indice: 1400,
        sousCategorie: 'HORS_ECHELLE',
      },
    })
    expect(correspondAuxFiltres(horsEchelle, avec({ classe: 1 }))).toBe(false)
    expect(correspondAuxFiltres(horsEchelle, avec({ indiceMin: 1400 }))).toBe(true)
  })
})

describe('correspondAuxFiltres — dates', () => {
  const d = dossierDeTest({
    dateNaissance: jour('1970-03-15'),
    datePriseService: jour('2000-09-01'),
  })

  it('année de naissance', () => {
    expect(correspondAuxFiltres(d, avec({ naissance: { annee: 1970 } }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ naissance: { annee: 1971 } }))).toBe(false)
  })

  it('naissance entre deux dates, bornes incluses', () => {
    expect(
      correspondAuxFiltres(
        d,
        avec({ naissance: { du: jour('1970-03-15'), au: jour('1970-03-15') } })
      )
    ).toBe(true)
    expect(correspondAuxFiltres(d, avec({ naissance: { du: jour('1970-03-16') } }))).toBe(false)
    expect(correspondAuxFiltres(d, avec({ naissance: { au: jour('1970-03-14') } }))).toBe(false)
  })

  it('l’année et la plage se combinent (intersection)', () => {
    expect(
      correspondAuxFiltres(d, avec({ naissance: { annee: 1970, du: jour('1970-06-01') } }))
    ).toBe(false)
    expect(
      correspondAuxFiltres(d, avec({ naissance: { annee: 1970, du: jour('1970-01-01') } }))
    ).toBe(true)
  })

  it('prise de service', () => {
    expect(correspondAuxFiltres(d, avec({ priseService: { annee: 2000 } }))).toBe(true)
    expect(correspondAuxFiltres(d, avec({ priseService: { au: jour('1999-12-31') } }))).toBe(false)
  })
})

describe('correspondAuxFiltres — recherche libre', () => {
  const alice = dossierDeTest({
    nom: 'MBARGA',
    prenom: 'Alice Marie',
    matricule: '0652 125K',
    domaineRecherche: 'Géomatique',
    lieuNaissance: 'Ngaoundéré',
  })
  const trouve = (recherche: string) => correspondAuxFiltres(alice, avec({ recherche }))

  it('trouve par nom, prénom, matricule, domaine ou lieu', () => {
    expect(trouve('mbarga')).toBe(true)
    expect(trouve('marie')).toBe(true)
    expect(trouve('125K')).toBe(true)
    expect(trouve('geomatique')).toBe(true)
    expect(trouve('ngaoundere')).toBe(true)
  })

  it('« Alice Mbarga » (prénom puis nom) trouve Alice MBARGA — D6', () => {
    expect(trouve('Alice Mbarga')).toBe(true)
    expect(trouve('mbarga alice')).toBe(true)
  })

  it('tous les mots doivent correspondre', () => {
    expect(trouve('alice dupont')).toBe(false)
  })

  it('ignore casse et accents, dans les deux sens', () => {
    expect(trouve('GÉOMATIQUE')).toBe(true)
    expect(trouve('ngaoundéré')).toBe(true)
  })

  it('trouve le matricule avec ou sans espace', () => {
    expect(trouve('0652125K')).toBe(true)
    expect(trouve('0652 125K')).toBe(true)
    expect(trouve('0652125Z')).toBe(false)
  })

  it('une recherche vide ou sans caractère utile ne restreint rien', () => {
    expect(trouve('')).toBe(true)
    expect(trouve('  - ')).toBe(true)
  })

  it('ne cherche pas dans les autres champs (statut, grade…)', () => {
    expect(trouve('professeur')).toBe(false)
  })
})

describe('correspondAuxFiltres — critères combinés', () => {
  it('tous les critères doivent être satisfaits', () => {
    const d = dossierDeTest({ sexe: 'F', grade: 'PROFESSEUR' })
    expect(
      correspondAuxFiltres(d, avec({ sexe: 'F', grades: ['PROFESSEUR'], regionId: 'reg-ouest' }))
    ).toBe(true)
    expect(
      correspondAuxFiltres(d, avec({ sexe: 'F', grades: ['PROFESSEUR'], regionId: 'autre' }))
    ).toBe(false)
  })
})
