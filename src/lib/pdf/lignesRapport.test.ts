import { describe, expect, it } from 'vitest'
import {
  construireEtablissementsRapport,
  type AvancementDuRapport,
  type SelectionDuRapport,
} from './lignesRapport'

const position = (grade: string, classe: number, echelon: number, indice: number) => ({
  grade,
  sousCategorie: null,
  classe,
  echelon,
  indice,
})
const CC_2_2 = position('CHARGE_DE_COURS', 2, 2, 785)
const CC_2_3 = position('CHARGE_DE_COURS', 2, 3, 870)
const MC_1_1 = position('MAITRE_DE_CONFERENCES', 1, 1, 1140)

const FIN = new Date('2025-12-31')
const EFFET_AVANT = new Date('2023-11-26')

function selection(
  enseignantId: string,
  surcharge: {
    nom?: string
    actuelle?: ReturnType<typeof position>
    dateEffetEchelon?: Date
    proposee?: ReturnType<typeof position>
    etablissement?: { nom: string; abreviation: string | null }
  } = {}
): SelectionDuRapport {
  return {
    enseignantId,
    positionProposee: surcharge.proposee ?? CC_2_3,
    enseignant: {
      nom: surcharge.nom ?? `NOM-${enseignantId}`,
      prenom: 'Jean',
      matricule: '1134259T',
      diplomePlusEleve: 'Doc. Ph.D',
      dateEffetEchelon: surcharge.dateEffetEchelon ?? EFFET_AVANT,
      positionActuelle: surcharge.actuelle ?? CC_2_2,
      departement: {
        etablissement: surcharge.etablissement ?? { nom: 'Faculté A', abreviation: 'FA' },
      },
    },
  }
}

function avancement(
  enseignantId: string,
  surcharge: Partial<AvancementDuRapport> = {}
): AvancementDuRapport {
  return {
    enseignantId,
    anciennePosition: CC_2_2,
    nouvellePosition: CC_2_3,
    dateAncienEffet: EFFET_AVANT,
    dateNouvelEffet: FIN,
    avisCU: false,
    avisCA: false,
    observations: null,
    ...surcharge,
  }
}

describe('construireEtablissementsRapport : rapport en brouillon', () => {
  it('lit le dernier avancement dans la fiche et le nouveau dans la position proposée', () => {
    const [etablissement] = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [selection('e1')],
      avancements: [],
    })

    expect(etablissement?.lignes).toEqual([
      expect.objectContaining({
        grade: 'CHARGE_DE_COURS',
        dateDernierAvancement: EFFET_AVANT,
        dernierAvancement: '2C/2E/785',
        dateNouvelAvancement: FIN,
        nouvelAvancement: '2C/3E/870',
        observations: '',
        avisCU: false,
        avisCA: false,
      }),
    ])
  })
})

describe('construireEtablissementsRapport : rapport validé', () => {
  it('lit les deux avancements dans l’historique, pas dans la fiche déjà mise à jour', () => {
    // Après validation, la fiche porte la nouvelle position et sa date : la lire ferait
    // imprimer deux fois la même chose.
    const fiche = selection('e1', { actuelle: CC_2_3, dateEffetEchelon: FIN })

    const [etablissement] = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [fiche],
      avancements: [avancement('e1')],
    })

    expect(etablissement?.lignes[0]).toEqual(
      expect.objectContaining({
        dateDernierAvancement: EFFET_AVANT,
        dernierAvancement: '2C/2E/785',
        dateNouvelAvancement: FIN,
        nouvelAvancement: '2C/3E/870',
      })
    )
  })

  it('range l’enseignant sous le grade qu’il avait avant l’avancement', () => {
    const fiche = selection('e1', { actuelle: MC_1_1, dateEffetEchelon: FIN })

    const [etablissement] = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [fiche],
      avancements: [avancement('e1', { anciennePosition: CC_2_2, nouvellePosition: MC_1_1 })],
    })

    expect(etablissement?.lignes[0]?.grade).toBe('CHARGE_DE_COURS')
    expect(etablissement?.lignes[0]?.nouvelAvancement).toBe('1C/1E/1140')
  })

  it('reprend les avis et les observations enregistrés', () => {
    const [etablissement] = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [selection('e1'), selection('e2')],
      avancements: [
        avancement('e1', { avisCU: true, avisCA: true, observations: 'Transféré' }),
        avancement('e2'),
      ],
    })

    expect(etablissement?.lignes.map((l) => [l.avisCU, l.avisCA, l.observations])).toEqual([
      [true, true, 'Transféré'],
      [false, false, ''],
    ])
  })

  it('traite un enseignant sans historique comme dans un brouillon', () => {
    const [etablissement] = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [selection('e1'), selection('e2')],
      avancements: [avancement('e1', { nouvellePosition: MC_1_1 })],
    })

    expect(etablissement?.lignes.map((l) => l.nouvelAvancement)).toEqual([
      '1C/1E/1140',
      '2C/3E/870',
    ])
  })
})

describe('construireEtablissementsRapport : établissements', () => {
  it('regroupe les enseignants d’un même établissement et trie les établissements par nom', () => {
    const b = { nom: 'Faculté B', abreviation: 'FB' }
    const a = { nom: 'Faculté A', abreviation: 'FA' }

    const resultat = construireEtablissementsRapport({
      periodeFin: FIN,
      selections: [
        selection('e1', { etablissement: b }),
        selection('e2', { etablissement: a }),
        selection('e3', { etablissement: b }),
      ],
      avancements: [],
    })

    expect(resultat.map((e) => [e.nom, e.abreviation, e.lignes.length])).toEqual([
      ['Faculté A', 'FA', 1],
      ['Faculté B', 'FB', 2],
    ])
  })

  it('renvoie une liste vide pour un rapport sans sélection', () => {
    expect(
      construireEtablissementsRapport({ periodeFin: FIN, selections: [], avancements: [] })
    ).toEqual([])
  })
})
