import { afterEach, describe, expect, it } from 'vitest'
import { calculerProchainAvancementTheorique } from '../avancement/calculerProchainAvancementTheorique'
import { dateEligibiliteAvancement, estEligibleAvancement } from '../avancement/eligibilite'
import { calculerDateRetraitePrevue, estProcheRetraite } from './retraite'

// Les dates sont enregistrées à minuit UTC. Un calcul fait avec les accesseurs locaux
// (setFullYear) les décale quand le fuseau a changé d'heure légale entre les deux dates : le
// résultat tombe la veille à 23 h UTC. À New York, le 20 mars 1960 était en heure d'hiver
// (UTC-5) et le 20 mars 2015 en heure d'été (UTC-4).
const TZ_INITIAL = process.env.TZ

afterEach(() => {
  if (TZ_INITIAL === undefined) delete process.env.TZ
  else process.env.TZ = TZ_INITIAL
})

describe('calculs de carrière indépendants du fuseau de la machine', () => {
  it('date de retraite : le jour anniversaire exact, à minuit UTC', () => {
    process.env.TZ = 'America/New_York'
    const retraite = calculerDateRetraitePrevue(new Date('1960-03-20T00:00:00Z'), 'ASSISTANT')
    expect(retraite.toISOString()).toBe('2015-03-20T00:00:00.000Z')
  })

  it('date d’éligibilité à l’avancement : la même dans les trois fonctions qui la calculent', () => {
    process.env.TZ = 'America/New_York'
    // 9 mars 2013 : heure d'hiver ; 9 mars 2015 : heure d'été (elle a commencé le 8).
    const effet = new Date('2013-03-09T00:00:00Z')
    const attendue = '2015-03-09T00:00:00.000Z'
    expect(dateEligibiliteAvancement(effet).toISOString()).toBe(attendue)
    expect(
      calculerProchainAvancementTheorique(effet, 'PROFESSEUR', 1, []).dateEligibilite.toISOString()
    ).toBe(attendue)
    expect(estEligibleAvancement(effet, new Date(attendue))).toBe(true)
    expect(estEligibleAvancement(effet, new Date('2015-03-08T23:59:59Z'))).toBe(false)
  })

  it('fenêtre « proche de la retraite » : la borne est le même jour, deux ans plus tard', () => {
    process.env.TZ = 'America/New_York'
    const naissance = new Date('1960-03-09T00:00:00Z') // Assistant : retraite le 09/03/2015
    expect(estProcheRetraite(naissance, 'ASSISTANT', 2, new Date('2013-03-09T00:00:00Z'))).toBe(
      true
    )
    expect(estProcheRetraite(naissance, 'ASSISTANT', 2, new Date('2013-03-08T00:00:00Z'))).toBe(
      false
    )
  })
})
