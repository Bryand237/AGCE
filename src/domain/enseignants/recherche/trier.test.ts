import { describe, expect, it } from 'vitest'
import { dossierDeTest, jour } from './dossiersDeTest'
import { avecSituation } from './selectionner'
import { GRILLE_DE_TEST } from './dossiersDeTest'
import { trierLignes } from './trier'
import type { DossierEnseignant } from '../dossier'

const lignes = (dossiers: DossierEnseignant[]) => avecSituation(dossiers, GRILLE_DE_TEST)
const noms = (resultat: ReturnType<typeof lignes>) => resultat.map((l) => l.dossier.nom)

describe('trierLignes', () => {
  it('trie par nom en ignorant la casse et les accents', () => {
    const l = lignes([
      dossierDeTest({ nom: 'Zéphyrin' }),
      dossierDeTest({ nom: 'abega' }),
      dossierDeTest({ nom: 'Éyinga' }),
    ])
    expect(noms(trierLignes(l, 'nom', 'asc'))).toEqual(['abega', 'Éyinga', 'Zéphyrin'])
    expect(noms(trierLignes(l, 'nom', 'desc'))).toEqual(['Zéphyrin', 'Éyinga', 'abega'])
  })

  it('trie par grade dans l’ordre officiel (Professeur d’abord), pas alphabétique', () => {
    const l = lignes([
      dossierDeTest({ nom: 'A', grade: 'ASSISTANT' }),
      dossierDeTest({ nom: 'B', grade: 'CHARGE_DE_COURS' }),
      dossierDeTest({ nom: 'C', grade: 'PROFESSEUR' }),
      dossierDeTest({ nom: 'D', grade: 'MAITRE_DE_CONFERENCES' }),
    ])
    expect(noms(trierLignes(l, 'grade', 'asc'))).toEqual(['C', 'D', 'B', 'A'])
    expect(noms(trierLignes(l, 'grade', 'desc'))).toEqual(['A', 'B', 'D', 'C'])
  })

  it('trie par statut : actifs, transférés, retraités', () => {
    const l = lignes([
      dossierDeTest({ nom: 'A', statut: 'RETRAITE' }),
      dossierDeTest({ nom: 'B', statut: 'ACTIF' }),
      dossierDeTest({ nom: 'C', statut: 'TRANSFERE' }),
    ])
    expect(noms(trierLignes(l, 'statut', 'asc'))).toEqual(['B', 'C', 'A'])
  })

  it('trie par établissement (abréviation)', () => {
    const etab = (abreviation: string) => ({ id: abreviation, nom: abreviation, abreviation })
    const l = lignes([
      dossierDeTest({ nom: 'A', etablissement: etab('FS') }),
      dossierDeTest({ nom: 'B', etablissement: etab('FALSH') }),
    ])
    expect(noms(trierLignes(l, 'etablissement', 'asc'))).toEqual(['B', 'A'])
  })

  it('trie par date de retraite, les transférés (sans date) toujours en dernier', () => {
    const l = lignes([
      dossierDeTest({ nom: 'Tard', dateNaissance: jour('1990-01-01') }),
      dossierDeTest({ nom: 'Parti', statut: 'TRANSFERE', dateFinService: jour('2020-01-01') }),
      dossierDeTest({ nom: 'Tot', dateNaissance: jour('1960-01-01') }),
    ])
    expect(noms(trierLignes(l, 'retraite', 'asc'))).toEqual(['Tot', 'Tard', 'Parti'])
    expect(noms(trierLignes(l, 'retraite', 'desc'))).toEqual(['Tard', 'Tot', 'Parti'])
  })

  it('trie par date de prise de service et de naissance', () => {
    const l = lignes([
      dossierDeTest({
        nom: 'A',
        datePriseService: jour('2010-01-01'),
        dateNaissance: jour('1980-01-01'),
      }),
      dossierDeTest({
        nom: 'B',
        datePriseService: jour('2000-01-01'),
        dateNaissance: jour('1990-01-01'),
      }),
    ])
    expect(noms(trierLignes(l, 'priseService', 'asc'))).toEqual(['B', 'A'])
    expect(noms(trierLignes(l, 'naissance', 'asc'))).toEqual(['A', 'B'])
  })

  it('à égalité de clé, départage par nom, prénom puis identifiant — dans les deux sens', () => {
    const l = lignes([
      dossierDeTest({ nom: 'B', prenom: 'Zoé', id: '3' }),
      dossierDeTest({ nom: 'B', prenom: 'Alice', id: '2' }),
      dossierDeTest({ nom: 'A', prenom: 'Zoé', id: '1' }),
      dossierDeTest({ nom: 'B', prenom: 'Alice', id: '1' }),
    ])
    const ids = (r: ReturnType<typeof lignes>) =>
      r.map((x) => `${x.dossier.nom}-${x.dossier.prenom}-${x.dossier.id}`)
    expect(ids(trierLignes(l, 'grade', 'asc'))).toEqual([
      'A-Zoé-1',
      'B-Alice-1',
      'B-Alice-2',
      'B-Zoé-3',
    ])
    expect(ids(trierLignes(l, 'grade', 'desc'))).toEqual([
      'A-Zoé-1',
      'B-Alice-1',
      'B-Alice-2',
      'B-Zoé-3',
    ])
  })

  it('ne modifie pas la liste reçue', () => {
    const l = lignes([dossierDeTest({ nom: 'B' }), dossierDeTest({ nom: 'A' })])
    const avant = noms(l)
    trierLignes(l, 'nom', 'asc')
    expect(noms(l)).toEqual(avant)
  })
})
