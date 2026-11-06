import { describe, expect, it } from 'vitest'
import { absenceRepondAuCritere, correspondAuxAbsences } from './correspondAbsences'
import { critereAbsenceNeutre } from './filtres'
import type { CritereAbsence } from './filtres'
import { dossierDeTest, jour } from './dossiersDeTest'
import type { AbsenceDossier } from '../dossier'

const AUJOURDHUI = jour('2026-10-20')

const critere = (surcharge: Partial<CritereAbsence> = {}): CritereAbsence => ({
  ...critereAbsenceNeutre(),
  ...surcharge,
})

let numero = 0
function absence(surcharge: Partial<AbsenceDossier> = {}): AbsenceDossier {
  numero += 1
  return {
    id: `abs-${numero}`,
    type: 'MISSION',
    statut: 'EN_PERIODE',
    dateDebut: jour('2026-10-01'),
    dateFin: jour('2026-10-31'),
    dateRetour: null,
    motif: null,
    ...surcharge,
  }
}

const enseignantAvec = (...absences: AbsenceDossier[]) => dossierDeTest({ absences })
const correspond = (absences: AbsenceDossier[], c: CritereAbsence) =>
  correspondAuxAbsences(enseignantAvec(...absences), c, AUJOURDHUI)

describe('correspondAuxAbsences — sans critère', () => {
  it('retient tout le monde, avec ou sans absence', () => {
    expect(correspond([], critere())).toBe(true)
    expect(correspond([absence()], critere())).toBe(true)
  })
})

describe('correspondAuxAbsences — présence', () => {
  it('oui seul : a (eu ou aura) au moins une absence', () => {
    expect(correspond([], critere({ presence: true }))).toBe(false)
    expect(
      correspond(
        [absence({ statut: 'TERMINE', dateRetour: jour('2026-01-10') })],
        critere({ presence: true })
      )
    ).toBe(true)
  })

  it('non seul : n’a aucune absence enregistrée', () => {
    expect(correspond([], critere({ presence: false }))).toBe(true)
    expect(correspond([absence()], critere({ presence: false }))).toBe(false)
  })
})

describe('correspondAuxAbsences — état', () => {
  const enCours = absence()
  const aVenir = absence({ dateDebut: jour('2026-12-01'), dateFin: jour('2026-12-20') })
  const depassee = absence({ dateDebut: jour('2026-08-01'), dateFin: jour('2026-09-01') })
  const terminee = absence({
    statut: 'TERMINE',
    dateRetour: jour('2026-05-02'),
    dateDebut: jour('2026-04-01'),
    dateFin: jour('2026-05-01'),
  })

  it('chaque état trouve la bonne absence', () => {
    expect(correspond([enCours], critere({ etats: ['en-cours'] }))).toBe(true)
    expect(correspond([aVenir], critere({ etats: ['en-cours'] }))).toBe(false)
    expect(correspond([aVenir], critere({ etats: ['a-venir'] }))).toBe(true)
    expect(correspond([depassee], critere({ etats: ['depassee'] }))).toBe(true)
    expect(correspond([depassee], critere({ etats: ['en-cours'] }))).toBe(false)
    expect(correspond([terminee], critere({ etats: ['terminee'] }))).toBe(true)
    expect(correspond([terminee], critere({ etats: ['en-cours', 'a-venir', 'depassee'] }))).toBe(
      false
    )
  })

  it('plusieurs états : l’un OU l’autre', () => {
    expect(correspond([aVenir], critere({ etats: ['en-cours', 'a-venir'] }))).toBe(true)
  })

  it('une absence passée ne compte pas comme « en cours » même si la base la dit en période', () => {
    expect(depassee.statut).toBe('EN_PERIODE')
    expect(correspond([depassee], critere({ etats: ['en-cours'] }))).toBe(false)
  })

  it('« sans absence en cours » laisse passer celui qui n’a que du passé', () => {
    expect(correspond([terminee, aVenir], critere({ presence: false, etats: ['en-cours'] }))).toBe(
      true
    )
    expect(correspond([terminee, enCours], critere({ presence: false, etats: ['en-cours'] }))).toBe(
      false
    )
  })
})

describe('correspondAuxAbsences — type', () => {
  it('un ou plusieurs types', () => {
    const maternite = absence({ type: 'CONGE_MATERNITE' })
    expect(correspond([maternite], critere({ types: ['MISSION'] }))).toBe(false)
    expect(correspond([maternite], critere({ types: ['MISSION', 'CONGE_MATERNITE'] }))).toBe(true)
  })

  it('« sans mission » : n’a jamais été en mission', () => {
    const critereSansMission = critere({ presence: false, types: ['MISSION'] })
    expect(correspond([absence({ type: 'CONGE_MALADIE' })], critereSansMission)).toBe(true)
    expect(correspond([absence({ type: 'MISSION' })], critereSansMission)).toBe(false)
  })
})

describe('correspondAuxAbsences — tous les critères portent sur la MÊME absence', () => {
  const missionPassee = absence({
    type: 'MISSION',
    dateDebut: jour('2026-01-05'),
    dateFin: jour('2026-01-30'),
    statut: 'TERMINE',
    dateRetour: jour('2026-01-30'),
  })
  const congeEnCours = absence({ type: 'CONGE_MALADIE' })

  it('une mission d’un côté et un congé en cours de l’autre ne font pas « mission en cours »', () => {
    expect(
      correspond(
        [missionPassee, congeEnCours],
        critere({ types: ['MISSION'], etats: ['en-cours'] })
      )
    ).toBe(false)
  })

  it('une absence qui réunit tout correspond', () => {
    expect(
      correspond(
        [missionPassee, congeEnCours],
        critere({ types: ['CONGE_MALADIE'], etats: ['en-cours'] })
      )
    ).toBe(true)
  })
})

describe('correspondAuxAbsences — dates de début et de fin', () => {
  const a = absence({ dateDebut: jour('2026-11-10'), dateFin: jour('2026-12-05') })

  it('début : par année et par période', () => {
    expect(correspond([a], critere({ debut: { annee: 2026 } }))).toBe(true)
    expect(correspond([a], critere({ debut: { annee: 2027 } }))).toBe(false)
    expect(
      correspond([a], critere({ debut: { du: jour('2026-11-10'), au: jour('2026-11-10') } }))
    ).toBe(true)
    expect(correspond([a], critere({ debut: { du: jour('2026-11-11') } }))).toBe(false)
  })

  it('fin : par année et par période', () => {
    expect(correspond([a], critere({ fin: { au: jour('2026-12-04') } }))).toBe(false)
    expect(correspond([a], critere({ fin: { au: jour('2026-12-05') } }))).toBe(true)
    expect(correspond([a], critere({ fin: { annee: 2026 } }))).toBe(true)
  })

  it('début et fin se combinent', () => {
    expect(correspond([a], critere({ debut: { annee: 2026 }, fin: { annee: 2027 } }))).toBe(false)
  })
})

describe('correspondAuxAbsences — absent pendant une période', () => {
  const a = absence({ dateDebut: jour('2026-11-10'), dateFin: jour('2026-12-05') })

  it('toute période qui recoupe l’absence, d’un seul jour comme de plusieurs mois', () => {
    expect(
      correspond([a], critere({ pendant: { du: jour('2026-12-05'), au: jour('2027-01-31') } }))
    ).toBe(true)
    expect(correspond([a], critere({ pendant: { du: jour('2026-12-06') } }))).toBe(false)
    expect(correspond([a], critere({ pendant: { au: jour('2026-11-09') } }))).toBe(false)
    expect(
      correspond([a], critere({ pendant: { du: jour('2026-11-20'), au: jour('2026-11-21') } }))
    ).toBe(true)
  })

  it('une année : absent à un moment de l’année', () => {
    expect(correspond([a], critere({ pendant: { annee: 2026 } }))).toBe(true)
    expect(correspond([a], critere({ pendant: { annee: 2025 } }))).toBe(false)
    expect(correspond([a], critere({ pendant: { annee: 2027 } }))).toBe(false)
  })

  it('le retour réel remplace la fin prévue', () => {
    const revenuTot = absence({
      dateDebut: jour('2026-11-10'),
      dateFin: jour('2026-12-05'),
      dateRetour: jour('2026-11-15'),
      statut: 'TERMINE',
    })
    expect(correspond([revenuTot], critere({ pendant: { du: jour('2026-11-20') } }))).toBe(false)
    expect(correspond([revenuTot], critere({ pendant: { du: jour('2026-11-15') } }))).toBe(true)
  })

  it('« sans absence pendant » : disponible sur la période', () => {
    expect(correspond([a], critere({ presence: false, pendant: { du: jour('2027-01-01') } }))).toBe(
      true
    )
    expect(correspond([a], critere({ presence: false, pendant: { du: jour('2026-12-01') } }))).toBe(
      false
    )
  })
})

describe('absenceRepondAuCritere', () => {
  it('juge une absence isolée', () => {
    const a = absence({ type: 'CONGE_MATERNITE' })
    expect(
      absenceRepondAuCritere(
        a,
        critere({ types: ['CONGE_MATERNITE'], etats: ['en-cours'] }),
        AUJOURDHUI
      )
    ).toBe(true)
    expect(absenceRepondAuCritere(a, critere({ types: ['MISSION'] }), AUJOURDHUI)).toBe(false)
  })
})
