import { describe, expect, it } from 'vitest'
import { construireCsvEdition } from './csvEdition'
import type { DemandeEdition } from '@/domain/editions/editions'
import { GRILLE_DE_TEST, dossierDeTest, jour } from '@/domain/enseignants/recherche/dossiersDeTest'
import { avecSituation } from '@/domain/enseignants/recherche/selectionner'
import type { AbsenceDossier, DossierEnseignant } from '@/domain/enseignants/dossier'

const DEMANDE: DemandeEdition = { cle: 'retraite', annee: 2027 }
const etab = (id: string, nom: string) => ({ id, nom, abreviation: id.toUpperCase() })

const csv = (...dossiers: DossierEnseignant[]) =>
  construireCsvEdition(DEMANDE, avecSituation(dossiers, GRILLE_DE_TEST))

const cellules = (texte: string) =>
  texte
    .slice(1)
    .split('\r\n')
    .filter((l) => l !== '')
    .map((l) => l.split(';'))

describe('construireCsvEdition', () => {
  const retraitable = (surcharge: Partial<DossierEnseignant> = {}) =>
    dossierDeTest({ grade: 'PROFESSEUR', dateNaissance: jour('1962-09-24'), ...surcharge })

  it('commence par la marque UTF-8 et les en-têtes, établissement en tête', () => {
    const texte = csv(retraitable())
    expect(texte.charCodeAt(0)).toBe(0xfeff)
    expect(cellules(texte)[0]).toEqual([
      'Établissement',
      'Nom et prénom',
      'Date de Naissance',
      'Lieu de Naissance',
      'Matricule solde',
      'Grade',
      'Sexe',
      'Domaine de recherche',
      "Département d'attache",
      'Date de prise de service',
      'Date de retraite',
      "Région d'origine",
      "Département d'origine",
    ])
  })

  it('écrit le grade et la région en toutes lettres et la date de retraite', () => {
    const ligne = cellules(csv(retraitable({ nom: 'ABEGA', prenom: 'Paul' })))[1]!
    expect(ligne[0]).toBe('Faculté des Arts, Lettres et Sciences Humaines')
    expect(ligne[1]).toBe('ABEGA Paul')
    expect(ligne[5]).toBe('Professeur')
    expect(ligne[10]).toBe('24/09/2027')
    expect(ligne[11]).toBe('Ouest')
  })

  it('regroupe par établissement dans l’ordre alphabétique, en gardant l’ordre de la sélection', () => {
    const texte = csv(
      retraitable({ nom: 'Z1', etablissement: etab('fs', 'Faculté des Sciences') }),
      retraitable({ nom: 'A1', etablissement: etab('enspn', 'École Nationale') }),
      retraitable({ nom: 'A2', etablissement: etab('fs', 'Faculté des Sciences') })
    )
    expect(
      cellules(texte)
        .slice(1)
        .map((l) => `${l[0]}|${l[1]!.split(' ')[0]}`)
    ).toEqual(['École Nationale|A1', 'Faculté des Sciences|Z1', 'Faculté des Sciences|A2'])
  })

  it('une liste vide donne les en-têtes seuls', () => {
    expect(cellules(csv())).toHaveLength(1)
  })

  it('met entre guillemets une valeur qui contient le séparateur, et neutralise les formules', () => {
    const texte = csv(
      retraitable({ nom: '=CMD()', domaineRecherche: 'Chimie; physique', lieuNaissance: 'Bafia' })
    )
    expect(texte).toContain(";'=CMD() Alice;")
    expect(texte).toContain('"Chimie; physique"')
  })
})

describe('construireCsvEdition — transférés et collaboration', () => {
  const lire = (demande: DemandeEdition, ...dossiers: DossierEnseignant[]) =>
    cellules(construireCsvEdition(demande, avecSituation(dossiers, GRILLE_DE_TEST)))

  it('transférés : date et université d’accueil entre la prise de service et l’origine', () => {
    const [entetes, ligne] = lire(
      { cle: 'transferes' },
      dossierDeTest({
        statut: 'TRANSFERE',
        dateFinService: jour('2025-01-15'),
        lieuTransfert: 'Université de Douala',
      })
    )
    expect(entetes!.slice(10, 14)).toEqual([
      'Date de transfert',
      "Université d'accueil",
      "Région d'origine",
      "Département d'origine",
    ])
    expect(ligne!.slice(10, 14)).toEqual([
      '15/01/2025',
      'Université de Douala',
      'Ouest',
      'Bamboutos',
    ])
  })

  it('collaboration : les deux colonnes de dates existent et sont vides', () => {
    const [entetes, ligne] = lire(
      { cle: 'collaboration' },
      dossierDeTest({ contratCollaboration: true })
    )
    expect(entetes).toContain('Date de début de la collaboration')
    expect(entetes).toContain('Date de fin de la collaboration')
    expect(ligne).toHaveLength(entetes!.length)
    const debut = entetes!.indexOf('Date de début de la collaboration')
    expect(ligne![debut]).toBe('')
    expect(ligne![debut + 1]).toBe('')
  })
})

describe('construireCsvEdition — congés et missions', () => {
  const absence = (type: AbsenceDossier['type'], motif: string | null = null): AbsenceDossier => ({
    id: 'a1',
    type,
    statut: 'EN_PERIODE',
    dateDebut: jour('2026-09-01'),
    dateFin: jour('2026-12-08'),
    dateRetour: null,
    motif,
  })
  const ligne = (a: AbsenceDossier) => ({
    ...avecSituation([dossierDeTest()], GRILLE_DE_TEST)[0]!,
    absence: a,
  })

  it('congés : le type du congé est une colonne, les dates suivent', () => {
    const [entetes, donnees] = cellules(
      construireCsvEdition({ cle: 'conges' }, [ligne(absence('CONGE_MATERNITE'))])
    )
    const debut = entetes!.indexOf('Date de début du congé')
    expect(entetes![debut - 1]).toBe('Type de congé')
    expect(donnees!.slice(debut - 1, debut + 2)).toEqual([
      'Congé de maternité',
      '01/09/2026',
      '08/12/2026',
    ])
  })

  it('congés : aucune colonne de motif, même quand l’absence en a un', () => {
    const texte = construireCsvEdition({ cle: 'conges' }, [
      ligne(absence('CONGE_MALADIE', 'Secret médical')),
    ])
    expect(texte).not.toContain('Secret médical')
    expect(cellules(texte)[0]).not.toContain('Motif')
  })

  it('missions : le motif est dans la colonne « Lieu d’accueil / motif »', () => {
    const [entetes, donnees] = cellules(
      construireCsvEdition({ cle: 'missions' }, [ligne(absence('MISSION', 'Paris'))])
    )
    expect(donnees![entetes!.indexOf("Lieu d'accueil / motif")]).toBe('Paris')
  })

  it('missions : un motif avec « ; » ou un retour à la ligne reste dans sa cellule', () => {
    const texte = construireCsvEdition({ cle: 'missions' }, [
      ligne(absence('MISSION', 'Colloque; atelier\nParis')),
    ])
    expect(texte).toContain('"Colloque; atelier Paris"')
  })
})
