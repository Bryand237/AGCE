import { describe, expect, it } from 'vitest'
import type { PalierIndiciaire } from '../avancement/calculerProchainEchelon'
import { calculerSituation } from './situation'
import type { EntreeSituation } from './situation'

const j = (texte: string) => new Date(`${texte}T00:00:00Z`)

const palier = (grade: string, ordre: number, voie: string | null = null): PalierIndiciaire => ({
  id: `${grade}-${voie ?? 'x'}-${ordre}`,
  grade,
  voie,
  sousCategorie: null,
  classe: null,
  echelon: ordre,
  indice: 1000 + ordre,
  ordre,
})

// Professeur : 3 paliers ; Assistant : deux voies parallèles (ordre continu sur le grade).
const GRILLE: PalierIndiciaire[] = [
  palier('PROFESSEUR', 1),
  palier('PROFESSEUR', 2),
  palier('PROFESSEUR', 3),
  palier('ASSISTANT', 1, 'SANS_THESE'),
  palier('ASSISTANT', 2, 'SANS_THESE'),
  palier('ASSISTANT', 3, 'AVEC_THESE'),
]

function enseignant(surcharge: Partial<EntreeSituation> = {}): EntreeSituation {
  return {
    statut: 'ACTIF',
    grade: 'PROFESSEUR',
    dateNaissance: j('1964-09-24'),
    dateFinService: null,
    dateEffetEchelon: j('2024-07-01'),
    ordrePosition: 1,
    ...surcharge,
  }
}

describe('calculerSituation — retraite', () => {
  it('actif : naissance + âge de retraite du grade (exemple du client : PR né le 24/09/1964 → 24/09/2029)', () => {
    const s = calculerSituation(enseignant(), GRILLE)
    expect(s.dateRetraite).toEqual(j('2029-09-24'))
    expect(s.retraiteEnregistree).toBe(false)
  })

  it('actif : l’âge dépend du grade (Assistant 55 ans, Chargé de Cours 60 ans)', () => {
    const assistant = calculerSituation(
      enseignant({ grade: 'ASSISTANT', ordrePosition: 1, dateNaissance: j('1980-03-15') }),
      GRILLE
    )
    expect(assistant.dateRetraite).toEqual(j('2035-03-15'))
    const charge = calculerSituation(
      enseignant({ grade: 'CHARGE_DE_COURS', dateNaissance: j('1980-03-15') }),
      GRILLE
    )
    expect(charge.dateRetraite).toEqual(j('2040-03-15'))
  })

  it('retraité : la date réellement enregistrée l’emporte sur la date théorique', () => {
    const s = calculerSituation(
      enseignant({ statut: 'RETRAITE', dateFinService: j('2027-02-01') }),
      GRILLE
    )
    expect(s.dateRetraite).toEqual(j('2027-02-01'))
    expect(s.retraiteEnregistree).toBe(true)
  })

  it('retraité sans date enregistrée : retombe sur la date théorique, signalée comme calculée', () => {
    const s = calculerSituation(enseignant({ statut: 'RETRAITE', dateFinService: null }), GRILLE)
    expect(s.dateRetraite).toEqual(j('2029-09-24'))
    expect(s.retraiteEnregistree).toBe(false)
  })

  it('transféré : aucune date de retraite', () => {
    const s = calculerSituation(
      enseignant({ statut: 'TRANSFERE', dateFinService: j('2025-01-01') }),
      GRILLE
    )
    expect(s.dateRetraite).toBeNull()
    expect(s.retraiteEnregistree).toBe(false)
  })
})

describe('calculerSituation — avancement', () => {
  it('actif : éligible 2 ans après la date d’effet de l’échelon', () => {
    const s = calculerSituation(enseignant({ dateEffetEchelon: j('2024-07-01') }), GRILLE)
    expect(s.dateProchainAvancement).toEqual(j('2026-07-01'))
    expect(s.finDeGrade).toBe(false)
  })

  it('actif au dernier palier : pas de prochain avancement, fin de grade', () => {
    const s = calculerSituation(enseignant({ ordrePosition: 3 }), GRILLE)
    expect(s.dateProchainAvancement).toBeNull()
    expect(s.finDeGrade).toBe(true)
  })

  it('Assistant sans thèse au dernier échelon de sa voie : fin de grade, sans passer à la voie « avec thèse »', () => {
    const s = calculerSituation(enseignant({ grade: 'ASSISTANT', ordrePosition: 2 }), GRILLE)
    expect(s.finDeGrade).toBe(true)
    expect(s.dateProchainAvancement).toBeNull()
  })

  it('retraité et transféré : aucun avancement, et pas « fin de grade »', () => {
    for (const statut of ['RETRAITE', 'TRANSFERE']) {
      const s = calculerSituation(enseignant({ statut, dateFinService: j('2025-01-01') }), GRILLE)
      expect(s.dateProchainAvancement).toBeNull()
      expect(s.finDeGrade).toBe(false)
    }
  })

  it('utilise la même durée que le calcul d’éligibilité du rapport', () => {
    // 29 février : le rapport et la liste doivent donner le même jour.
    const s = calculerSituation(enseignant({ dateEffetEchelon: j('2024-02-29') }), GRILLE)
    expect(s.dateProchainAvancement).toEqual(j('2026-03-01'))
  })
})
