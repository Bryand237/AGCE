import { describe, it, expect } from 'vitest'
import {
  calculerAgeRetraite,
  calculerDateRetraitePrevue,
  estEligibleRetraite,
  estProcheRetraite,
} from './retraite'

describe('calculerAgeRetraite', () => {
  it('retourne 55 ans pour un Assistant', () => {
    expect(calculerAgeRetraite('ASSISTANT')).toBe(55)
  })

  it('retourne 60 ans pour un Chargé de Cours', () => {
    expect(calculerAgeRetraite('CHARGE_DE_COURS')).toBe(60)
  })

  it('retourne 65 ans pour un Maître de Conférences ou un Professeur', () => {
    expect(calculerAgeRetraite('MAITRE_DE_CONFERENCES')).toBe(65)
    expect(calculerAgeRetraite('PROFESSEUR')).toBe(65)
  })

  it('lève une erreur explicite pour un grade inconnu plutôt que de renvoyer undefined', () => {
    expect(() => calculerAgeRetraite('DOYEN')).toThrow(/grade/i)
  })
})

describe('calculerDateRetraitePrevue', () => {
  it('ajoute l’âge de retraite du grade à la date de naissance', () => {
    const date = calculerDateRetraitePrevue(new Date('1970-03-15'), 'CHARGE_DE_COURS')
    expect(date.getFullYear()).toBe(2030)
    expect(date.getMonth()).toBe(2) // mars, index 0
    expect(date.getDate()).toBe(15)
  })

  it('recule de 5 ans si le grade passe de Chargé de Cours à Maître de Conférences', () => {
    const naissance = new Date('1970-03-15')
    const dateEnCC = calculerDateRetraitePrevue(naissance, 'CHARGE_DE_COURS')
    const dateEnMC = calculerDateRetraitePrevue(naissance, 'MAITRE_DE_CONFERENCES')
    expect(dateEnMC.getFullYear() - dateEnCC.getFullYear()).toBe(5)
  })
})

describe('estEligibleRetraite', () => {
  it('est vrai le jour même de la date de retraite prévue', () => {
    const naissance = new Date('1965-01-01')
    const jourDeRetraite = new Date('2030-01-01') // Professeur : 1965 + 65 ans
    expect(estEligibleRetraite(naissance, 'PROFESSEUR', jourDeRetraite)).toBe(true)
  })

  it('est faux la veille de la date de retraite prévue', () => {
    const naissance = new Date('1965-01-01')
    const veille = new Date('2024-12-31')
    expect(estEligibleRetraite(naissance, 'PROFESSEUR', veille)).toBe(false)
  })
})

describe('estProcheRetraite', () => {
  it('détecte une retraite dans la fenêtre donnée', () => {
    const aujourdhui = new Date('2026-01-01')
    // Assistant né en 1972 → retraite théorique en 2027, dans la fenêtre de 2 ans
    expect(estProcheRetraite(new Date('1972-06-01'), 'ASSISTANT', 2, aujourdhui)).toBe(true)
  })

  it('ignore un départ encore lointain', () => {
    const aujourdhui = new Date('2026-01-01')
    expect(estProcheRetraite(new Date('1995-06-01'), 'ASSISTANT', 2, aujourdhui)).toBe(false)
  })

  it('exclut quelqu’un déjà au-delà de l’âge de retraite (déjà éligible, pas "bientôt")', () => {
    // Piège corrigé lors de la fusion des deux implémentations concurrentes :
    // une comparaison par ANNÉE seule aurait classé une retraite déjà
    // dépassée de plusieurs années comme "proche" (différence négative
    // toujours <= seuil). La comparaison doit être par date complète, et
    // exiger que la retraite soit encore dans le futur.
    const aujourdhui = new Date('2026-01-01')
    const dejaEligibleDepuis3Ans = new Date('1958-01-01') // Professeur : retraite en 2023
    expect(estProcheRetraite(dejaEligibleDepuis3Ans, 'PROFESSEUR', 2, aujourdhui)).toBe(false)
  })
})
