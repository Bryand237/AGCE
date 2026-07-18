import { describe, it, expect } from 'vitest'
import { calculerProchainEchelon, type PalierIndiciaire } from './calculerProchainEchelon'

const grilleTest: PalierIndiciaire[] = [
  {
    id: "p1",
    grade: 'CHARGE_DE_COURS',
    voie: null,
    sousCategorie: null,
    classe: 2,
    echelon: 2,
    indice: 785,
    ordre: 3,
  },
  {
    id: "p2",
    grade: 'CHARGE_DE_COURS',
    voie: null,
    sousCategorie: null,
    classe: 2,
    echelon: 3,
    indice: 870,
    ordre: 4,
  },
  {
    id: "p3",
    grade: 'PROFESSEUR',
    voie: null,
    sousCategorie: 'HORS_ECHELLE',
    classe: null,
    echelon: null,
    indice: 1400,
    ordre: 10,
  },
  // Deux voies parallèles et exclusives, avec un indice volontairement
  // identique (605) sur le dernier palier "sans thèse" et le premier
  // palier "avec thèse" — le cas exact qui a révélé le bug initial.
  {
    id: "p4",
    grade: 'ASSISTANT',
    voie: 'SANS_THESE',
    sousCategorie: null,
    classe: null,
    echelon: 3,
    indice: 605,
    ordre: 3,
  },
  {
    id: "p5",
    grade: 'ASSISTANT',
    voie: 'AVEC_THESE',
    sousCategorie: null,
    classe: null,
    echelon: 1,
    indice: 605,
    ordre: 4,
  },
]

describe('calculerProchainEchelon', () => {
  it('renvoie le palier suivant dans le même grade', () => {
    const suivant = calculerProchainEchelon(grilleTest, 'CHARGE_DE_COURS', 3)
    expect(suivant?.indice).toBe(870)
    expect(suivant?.echelon).toBe(3)
  })

  it('renvoie null quand il n’existe pas de palier suivant (Hors Échelle)', () => {
    const suivant = calculerProchainEchelon(grilleTest, 'PROFESSEUR', 10)
    expect(suivant).toBeNull()
  })

  it('renvoie null si l’ordre actuel est introuvable dans la grille', () => {
    const suivant = calculerProchainEchelon(grilleTest, 'CHARGE_DE_COURS', 999)
    expect(suivant).toBeNull()
  })

  it('ne franchit jamais la frontière entre deux voies parallèles', () => {
    // Un Assistant "sans thèse" à son dernier échelon (ordre 3) ne doit
    // JAMAIS se voir proposer le premier échelon "avec thèse" (ordre 4),
    // même si leurs indices coïncident (605 dans les deux cas). Changer
    // de voie est une question de qualification, pas d'avancement normal.
    const suivant = calculerProchainEchelon(grilleTest, 'ASSISTANT', 3)
    expect(suivant).toBeNull()
  })
})
