import { describe, expect, it } from 'vitest'
import { absenceActuelle, etatAbsence, ETATS_ABSENCE } from './etatAbsence'
import type { AbsenceDossier } from '../enseignants/dossier'

const jour = (texte: string) => new Date(`${texte}T00:00:00Z`)
const AUJOURDHUI = jour('2026-10-20')

function absence(surcharge: Partial<AbsenceDossier> = {}): AbsenceDossier {
  return {
    id: 'a1',
    type: 'MISSION',
    statut: 'EN_PERIODE',
    dateDebut: jour('2026-10-01'),
    dateFin: jour('2026-10-31'),
    dateRetour: null,
    motif: null,
    ...surcharge,
  }
}

describe('etatAbsence', () => {
  it('en cours : le début est atteint et la fin pas dépassée', () => {
    expect(etatAbsence(absence(), AUJOURDHUI)).toBe('en-cours')
  })

  it('le premier et le dernier jour comptent comme en cours', () => {
    expect(etatAbsence(absence({ dateDebut: jour('2026-10-20') }), AUJOURDHUI)).toBe('en-cours')
    expect(etatAbsence(absence({ dateFin: jour('2026-10-20') }), AUJOURDHUI)).toBe('en-cours')
  })

  it('à venir : le début est après aujourd’hui, même si la base la dit « en période »', () => {
    expect(etatAbsence(absence({ dateDebut: jour('2026-10-21') }), AUJOURDHUI)).toBe('a-venir')
    expect(
      etatAbsence(
        absence({
          statut: 'EN_PERIODE',
          dateDebut: jour('2027-01-05'),
          dateFin: jour('2027-02-05'),
        }),
        AUJOURDHUI
      )
    ).toBe('a-venir')
  })

  it('dépassée : la fin est passée sans retour enregistré', () => {
    expect(etatAbsence(absence({ dateFin: jour('2026-10-19') }), AUJOURDHUI)).toBe('depassee')
    // même si la base n'a pas encore basculé le statut en « dépassé »
    expect(
      etatAbsence(absence({ statut: 'EN_PERIODE', dateFin: jour('2026-09-01') }), AUJOURDHUI)
    ).toBe('depassee')
  })

  it('terminée : un retour est enregistré, quelles que soient les dates', () => {
    expect(
      etatAbsence(absence({ statut: 'TERMINE', dateRetour: jour('2026-10-10') }), AUJOURDHUI)
    ).toBe('terminee')
    expect(etatAbsence(absence({ dateRetour: jour('2026-10-05') }), AUJOURDHUI)).toBe('terminee')
    expect(
      etatAbsence(absence({ statut: 'TERMINE', dateDebut: jour('2027-01-01') }), AUJOURDHUI)
    ).toBe('terminee')
  })

  it('une absence en attente de validation compte comme les autres', () => {
    expect(etatAbsence(absence({ statut: 'EN_ATTENTE' }), AUJOURDHUI)).toBe('en-cours')
  })

  it('ne dépend que du jour donné', () => {
    const a = absence()
    expect(etatAbsence(a, jour('2026-09-30'))).toBe('a-venir')
    expect(etatAbsence(a, jour('2026-10-31'))).toBe('en-cours')
    expect(etatAbsence(a, jour('2026-11-01'))).toBe('depassee')
  })

  it('les quatre états sont connus', () => {
    expect([...ETATS_ABSENCE]).toEqual(['en-cours', 'a-venir', 'depassee', 'terminee'])
  })
})

describe('absenceActuelle', () => {
  it('rien quand l’enseignant n’a aucune absence ou seulement du passé et de l’avenir', () => {
    expect(absenceActuelle([], AUJOURDHUI)).toBeUndefined()
    expect(
      absenceActuelle(
        [
          absence({ id: 'future', dateDebut: jour('2027-01-01'), dateFin: jour('2027-02-01') }),
          absence({ id: 'finie', statut: 'TERMINE', dateRetour: jour('2026-08-01') }),
        ],
        AUJOURDHUI
      )
    ).toBeUndefined()
  })

  it('l’absence en cours', () => {
    const resultat = absenceActuelle([absence({ id: 'x' })], AUJOURDHUI)
    expect(resultat?.absence.id).toBe('x')
    expect(resultat?.etat).toBe('en-cours')
  })

  it('l’absence en cours passe avant celle dont le retour est attendu', () => {
    const resultat = absenceActuelle(
      [absence({ id: 'ancienne', dateFin: jour('2026-09-01') }), absence({ id: 'courante' })],
      AUJOURDHUI
    )
    expect(resultat?.absence.id).toBe('courante')
  })

  it('à défaut, celle dont le retour n’est pas enregistré', () => {
    const resultat = absenceActuelle(
      [absence({ id: 'oubliee', dateFin: jour('2026-09-01') })],
      AUJOURDHUI
    )
    expect(resultat?.etat).toBe('depassee')
  })
})
