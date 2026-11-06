import { describe, expect, it } from 'vitest'
import { erreurChangementFinDePeriode, memeJour, type AvancementDuRapport } from './periodeRapport'

function avancement(surcharge: Partial<AvancementDuRapport> = {}): AvancementDuRapport {
  return {
    nom: 'DUPONT',
    prenom: 'Jean',
    statutDecision: null,
    positionActuelleId: 'pos-3',
    nouvellePositionId: 'pos-3',
    ...surcharge,
  }
}

describe('memeJour', () => {
  it('reconnaît deux dates du même jour, quelle que soit l’heure', () => {
    expect(memeJour(new Date('2025-12-31'), new Date('2025-12-31T00:00:00Z'))).toBe(true)
    expect(memeJour(new Date('2025-12-31T00:00:00Z'), new Date('2025-12-31T18:30:00Z'))).toBe(true)
  })

  it('distingue deux jours consécutifs', () => {
    expect(memeJour(new Date('2025-12-31'), new Date('2026-01-01'))).toBe(false)
    expect(memeJour(new Date('2025-12-31T23:59:59Z'), new Date('2026-01-01T00:00:00Z'))).toBe(false)
  })
})

describe('erreurChangementFinDePeriode', () => {
  it('autorise quand chaque enseignant occupe la position du rapport et qu’aucune décision n’existe', () => {
    expect(
      erreurChangementFinDePeriode([avancement(), avancement({ nom: 'MARTIN' })])
    ).toBeUndefined()
  })

  it('autorise un rapport sans avancement', () => {
    expect(erreurChangementFinDePeriode([])).toBeUndefined()
  })

  it('refuse quand une décision a été générée, en nommant l’enseignant', () => {
    const message = erreurChangementFinDePeriode([avancement({ statutDecision: 'GENEREE' })])

    expect(message).toContain('DUPONT Jean (une décision a déjà été générée)')
    expect(message).toMatch(/Rien n’a été modifié\.$/)
  })

  it('refuse quand l’enseignant a changé de position depuis la validation', () => {
    const message = erreurChangementFinDePeriode([avancement({ positionActuelleId: 'pos-4' })])

    expect(message).toContain('DUPONT Jean (a changé de position depuis la validation)')
  })

  it('un seul enseignant bloquant suffit, et les autres ne sont pas cités', () => {
    const message = erreurChangementFinDePeriode([
      avancement({ nom: 'MARTIN', prenom: 'Paul' }),
      avancement({ statutDecision: 'VALIDEE' }),
    ])

    expect(message).toContain('DUPONT Jean')
    expect(message).not.toContain('MARTIN')
  })

  it('cite chaque enseignant en cause avec sa raison', () => {
    const message = erreurChangementFinDePeriode([
      avancement({ statutDecision: 'GENEREE' }),
      avancement({ nom: 'MARTIN', prenom: 'Paul', positionActuelleId: 'pos-9' }),
    ])

    expect(message).toContain(
      'DUPONT Jean (une décision a déjà été générée) ; MARTIN Paul (a changé de position depuis la validation)'
    )
  })

  it('abrège la liste au-delà de cinq enseignants', () => {
    const sept = Array.from({ length: 7 }, (_, i) =>
      avancement({ nom: `NOM${i + 1}`, statutDecision: 'GENEREE' })
    )

    const message = erreurChangementFinDePeriode(sept)

    expect(message).toContain('NOM5')
    expect(message).not.toContain('NOM6')
    expect(message).toContain(' et 2 autres.')
  })

  it('accorde « autre » au singulier pour un seul enseignant de plus', () => {
    const six = Array.from({ length: 6 }, (_, i) =>
      avancement({ nom: `NOM${i + 1}`, statutDecision: 'GENEREE' })
    )

    expect(erreurChangementFinDePeriode(six)).toContain(' et 1 autre.')
  })
})
