import { describe, expect, it } from 'vitest'
import { regrouperParEtablissement } from './parEtablissement'
import { avecSituation } from '@/domain/enseignants/recherche/selectionner'
import { GRILLE_DE_TEST, dossierDeTest } from '@/domain/enseignants/recherche/dossiersDeTest'

const etab = (id: string, nom: string) => ({ id, nom, abreviation: id.toUpperCase() })

describe('regrouperParEtablissement', () => {
  const lignes = avecSituation(
    [
      dossierDeTest({ nom: 'A1', etablissement: etab('fs', 'Faculté des Sciences') }),
      dossierDeTest({ nom: 'B1', etablissement: etab('enspn', 'École Nationale Supérieure') }),
      dossierDeTest({ nom: 'A2', etablissement: etab('fs', 'Faculté des Sciences') }),
      dossierDeTest({ nom: 'C1', etablissement: etab('falsh', 'Faculté des Arts') }),
    ],
    GRILLE_DE_TEST
  )

  it('fait un groupe par établissement, par ordre alphabétique de nom', () => {
    // « École » se range avec les E (avant les F), et non après le Z comme avec un tri par code.
    expect(regrouperParEtablissement(lignes).map((g) => g.nom)).toEqual([
      'École Nationale Supérieure',
      'Faculté des Arts',
      'Faculté des Sciences',
    ])
  })

  it('garde l’ordre reçu à l’intérieur de chaque groupe', () => {
    const sciences = regrouperParEtablissement(lignes).find((g) => g.id === 'fs')!
    expect(sciences.lignes.map((l) => l.dossier.nom)).toEqual(['A1', 'A2'])
  })

  it('ne crée aucun groupe pour une liste vide', () => {
    expect(regrouperParEtablissement([])).toEqual([])
  })

  it('départage deux établissements de même nom par identifiant (ordre stable)', () => {
    const memeNom = avecSituation(
      [
        dossierDeTest({ etablissement: etab('b', 'Institut') }),
        dossierDeTest({ etablissement: etab('a', 'Institut') }),
      ],
      GRILLE_DE_TEST
    )
    expect(regrouperParEtablissement(memeNom).map((g) => g.id)).toEqual(['a', 'b'])
  })
})
