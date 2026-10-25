import { describe, expect, it } from 'vitest'
import { STATUTS_ABSENCE } from '../enseignants/dossier'
import type { AbsenceAJuger } from './etapesAbsence'
import { presentationAttestation } from './presentationAttestation'

const absence = (partiel: Partial<AbsenceAJuger> = {}): AbsenceAJuger => ({
  statut: 'EN_PERIODE',
  type: 'CONGE_MATERNITE',
  statutAttestation: null,
  ...partiel,
})

const TYPES = ['MISSION', 'CONGE_MATERNITE', 'CONGE_MALADIE'] as const
const ATTESTATIONS = [null, 'EN_ATTENTE', 'VALIDEE'] as const

describe('presentationAttestation', () => {
  it.each(['CONGE_MATERNITE', 'CONGE_MALADIE'] as const)(
    'propose les étapes d’un %s en cours, avec ou sans attestation',
    (type) => {
      for (const statut of ['EN_PERIODE', 'DEPASSE'] as const) {
        for (const statutAttestation of ATTESTATIONS) {
          expect(presentationAttestation(absence({ type, statut, statutAttestation }))).toBe(
            'etapes'
          )
        }
      }
    }
  )

  it.each(['EN_ATTENTE', 'VALIDEE'] as const)(
    'laisse consultable l’attestation (%s) d’une absence terminée',
    (statutAttestation) => {
      expect(presentationAttestation(absence({ statut: 'TERMINE', statutAttestation }))).toBe(
        'consultation'
      )
    }
  )

  it('ne montre rien pour une absence terminée sans attestation, ni pour une absence en attente', () => {
    expect(presentationAttestation(absence({ statut: 'TERMINE' }))).toBe('aucune')
    expect(presentationAttestation(absence({ statut: 'EN_ATTENTE' }))).toBe('aucune')
  })

  it('ne montre rien pour une mission, quel que soit son statut', () => {
    for (const statut of STATUTS_ABSENCE) {
      expect(presentationAttestation(absence({ type: 'MISSION', statut }))).toBe('aucune')
    }
  })

  it('ne propose aucune étape pour une mission en cours, mais garde un document existant consultable', () => {
    expect(
      presentationAttestation(absence({ type: 'MISSION', statutAttestation: 'VALIDEE' }))
    ).toBe('consultation')
  })

  it('ne fait jamais disparaître une attestation enregistrée (toutes les combinaisons)', () => {
    for (const type of TYPES) {
      for (const statut of STATUTS_ABSENCE) {
        for (const statutAttestation of ATTESTATIONS) {
          const resultat = presentationAttestation(absence({ type, statut, statutAttestation }))
          if (statutAttestation !== null) expect(resultat).not.toBe('aucune')
        }
      }
    }
  })
})
