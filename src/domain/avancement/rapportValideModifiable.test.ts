import { describe, expect, it } from 'vitest'
import { erreurModificationRapportValide } from './rapportValideModifiable'

const AVANCEMENT = {
  statutDecision: null,
  positionActuelleId: 'p-nouvelle',
  nouvellePositionId: 'p-nouvelle',
}

describe('erreurModificationRapportValide', () => {
  it('autorise la modification tant qu’aucune décision n’existe et que la position est d’actualité', () => {
    expect(erreurModificationRapportValide(AVANCEMENT)).toBeUndefined()
  })

  it.each(['EN_ATTENTE', 'VALIDEE'])('refuse quand la décision est « %s »', (statut) => {
    expect(erreurModificationRapportValide({ ...AVANCEMENT, statutDecision: statut })).toMatch(
      /décision a déjà été générée/
    )
  })

  it('refuse quand l’enseignant a avancé depuis : on écraserait sa position actuelle', () => {
    expect(
      erreurModificationRapportValide({ ...AVANCEMENT, positionActuelleId: 'p-plus-recente' })
    ).toMatch(/a changé de position depuis/)
  })

  it('annonce la décision avant le changement de position', () => {
    expect(
      erreurModificationRapportValide({
        statutDecision: 'EN_ATTENTE',
        positionActuelleId: 'autre',
        nouvellePositionId: 'p-nouvelle',
      })
    ).toMatch(/décision/)
  })
})
