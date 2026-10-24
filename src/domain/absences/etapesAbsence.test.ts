import { describe, expect, it } from 'vitest'
import { STATUTS_ABSENCE } from '../enseignants/dossier'
import { erreurEtapeAbsence, type AbsenceAJuger, type EtapeAbsence } from './etapesAbsence'

const absence = (partiel: Partial<AbsenceAJuger> = {}): AbsenceAJuger => ({
  statut: 'EN_PERIODE',
  type: 'MISSION',
  statutAttestation: null,
  ...partiel,
})

const CONGE = { type: 'CONGE_MATERNITE' } as const

describe('valider', () => {
  it('n’est permis que depuis « en attente »', () => {
    expect(erreurEtapeAbsence('valider', absence({ statut: 'EN_ATTENTE' }))).toBeUndefined()
  })

  it.each([
    ['EN_PERIODE', 'Cette absence est déjà validée.'],
    ['DEPASSE', 'Cette absence est déjà validée.'],
    ['TERMINE', 'Cette absence est terminée : elle ne peut plus être validée.'],
  ] as const)('est refusé depuis %s', (statut, message) => {
    expect(erreurEtapeAbsence('valider', absence({ statut }))).toBe(message)
  })
})

describe('terminer', () => {
  it('est permis depuis « en période » et « dépassée » pour une mission', () => {
    expect(erreurEtapeAbsence('terminer', absence({ statut: 'EN_PERIODE' }))).toBeUndefined()
    expect(erreurEtapeAbsence('terminer', absence({ statut: 'DEPASSE' }))).toBeUndefined()
  })

  it('est refusé avant la validation de l’absence', () => {
    expect(erreurEtapeAbsence('terminer', absence({ statut: 'EN_ATTENTE' }))).toBe(
      "Cette absence n'est pas encore validée : validez-la avant d'enregistrer le retour."
    )
  })

  it('est refusé quand le retour est déjà enregistré', () => {
    expect(erreurEtapeAbsence('terminer', absence({ statut: 'TERMINE' }))).toBe(
      'Le retour de cette absence est déjà enregistré.'
    )
  })

  it.each([null, 'EN_ATTENTE'] as const)(
    'un congé sans attestation signée (%s) ne se termine pas',
    (statutAttestation) => {
      expect(erreurEtapeAbsence('terminer', absence({ ...CONGE, statutAttestation }))).toBe(
        "La fin d'absence ne peut être enregistrée qu'après validation de l'attestation."
      )
    }
  )

  it('un congé dont l’attestation est signée se termine', () => {
    expect(
      erreurEtapeAbsence('terminer', absence({ ...CONGE, statutAttestation: 'VALIDEE' }))
    ).toBeUndefined()
  })

  it('le congé de maladie suit la même règle que le congé de maternité', () => {
    expect(erreurEtapeAbsence('terminer', absence({ type: 'CONGE_MALADIE' }))).toMatch(
      /attestation/
    )
  })
})

describe('modifier', () => {
  it('est permis tant qu’aucune attestation n’existe, validée ou non', () => {
    for (const statut of ['EN_ATTENTE', 'EN_PERIODE', 'DEPASSE'] as const) {
      expect(erreurEtapeAbsence('modifier', absence({ statut }))).toBeUndefined()
    }
  })

  it('est refusé pour une absence terminée', () => {
    expect(erreurEtapeAbsence('modifier', absence({ statut: 'TERMINE' }))).toBe(
      'Cette absence est terminée : elle ne peut plus être modifiée.'
    )
  })

  it('est refusé quand un brouillon d’attestation existe, en indiquant comment corriger', () => {
    const message = erreurEtapeAbsence(
      'modifier',
      absence({ ...CONGE, statutAttestation: 'EN_ATTENTE' })
    )
    expect(message).toMatch(/brouillon d'attestation/)
    expect(message).toMatch(/supprimez l'absence et recréez-la/)
  })

  it('est refusé quand l’attestation est signée', () => {
    expect(
      erreurEtapeAbsence('modifier', absence({ ...CONGE, statutAttestation: 'VALIDEE' }))
    ).toMatch(/attestation signée/)
  })
})

describe('supprimer', () => {
  it('est permis en toute situation, sauf attestation signée', () => {
    for (const statut of STATUTS_ABSENCE) {
      for (const statutAttestation of [null, 'EN_ATTENTE'] as const) {
        expect(
          erreurEtapeAbsence('supprimer', absence({ ...CONGE, statut, statutAttestation }))
        ).toBeUndefined()
      }
    }
  })

  it.each(STATUTS_ABSENCE)('est refusé quand l’attestation est signée (absence %s)', (statut) => {
    expect(
      erreurEtapeAbsence('supprimer', absence({ ...CONGE, statut, statutAttestation: 'VALIDEE' }))
    ).toBe('Une attestation signée existe pour cette absence : elle ne peut pas être supprimée.')
  })
})

describe('genererAttestation', () => {
  it('est permis pour un congé en cours qui n’a pas encore d’attestation', () => {
    expect(erreurEtapeAbsence('genererAttestation', absence(CONGE))).toBeUndefined()
    expect(
      erreurEtapeAbsence('genererAttestation', absence({ ...CONGE, statut: 'DEPASSE' }))
    ).toBeUndefined()
  })

  it('est refusé pour une mission', () => {
    expect(erreurEtapeAbsence('genererAttestation', absence())).toBe(
      "Ce type d'absence n'a pas d'attestation."
    )
  })

  it('est refusé avant la validation de l’absence et après sa fin', () => {
    expect(
      erreurEtapeAbsence('genererAttestation', absence({ ...CONGE, statut: 'EN_ATTENTE' }))
    ).toBe("L'attestation se génère après la validation de l'absence.")
    expect(erreurEtapeAbsence('genererAttestation', absence({ ...CONGE, statut: 'TERMINE' }))).toBe(
      "Cette absence est terminée : l'attestation ne peut plus être générée."
    )
  })

  it.each(['EN_ATTENTE', 'VALIDEE'] as const)(
    'ne repart jamais d’une attestation %s : elle écraserait le document',
    (statutAttestation) => {
      expect(
        erreurEtapeAbsence('genererAttestation', absence({ ...CONGE, statutAttestation }))
      ).toBe('Une attestation existe déjà pour cette absence.')
    }
  )
})

describe('validerAttestation', () => {
  it('est permis pour un brouillon d’un congé en cours', () => {
    expect(
      erreurEtapeAbsence(
        'validerAttestation',
        absence({ ...CONGE, statutAttestation: 'EN_ATTENTE' })
      )
    ).toBeUndefined()
  })

  it('est refusé pour une mission', () => {
    expect(erreurEtapeAbsence('validerAttestation', absence())).toBe(
      "Ce type d'absence n'a pas d'attestation."
    )
  })

  it('est refusé sans brouillon, et quand l’attestation est déjà signée', () => {
    expect(erreurEtapeAbsence('validerAttestation', absence(CONGE))).toBe(
      "Générez d'abord le brouillon de l'attestation."
    )
    expect(
      erreurEtapeAbsence('validerAttestation', absence({ ...CONGE, statutAttestation: 'VALIDEE' }))
    ).toBe("L'attestation est déjà validée.")
  })

  it('est refusé avant la validation de l’absence et après sa fin', () => {
    const brouillon = { ...CONGE, statutAttestation: 'EN_ATTENTE' } as const
    expect(
      erreurEtapeAbsence('validerAttestation', absence({ ...brouillon, statut: 'EN_ATTENTE' }))
    ).toBe("L'attestation se valide après la validation de l'absence.")
    expect(
      erreurEtapeAbsence('validerAttestation', absence({ ...brouillon, statut: 'TERMINE' }))
    ).toBe("Cette absence est terminée : l'attestation ne peut plus être validée.")
  })
})

describe('parcours complet d’un congé', () => {
  it('suit l’ordre : valider, générer, signer, terminer, et rien d’autre à chaque étape', () => {
    const ETAPES: EtapeAbsence[] = [
      'valider',
      'terminer',
      'modifier',
      'supprimer',
      'genererAttestation',
      'validerAttestation',
    ]
    const permises = (a: AbsenceAJuger) =>
      ETAPES.filter((e) => erreurEtapeAbsence(e, a) === undefined)

    expect(permises(absence({ ...CONGE, statut: 'EN_ATTENTE' }))).toEqual([
      'valider',
      'modifier',
      'supprimer',
    ])
    expect(permises(absence({ ...CONGE, statutAttestation: null }))).toEqual([
      'modifier',
      'supprimer',
      'genererAttestation',
    ])
    expect(permises(absence({ ...CONGE, statutAttestation: 'EN_ATTENTE' }))).toEqual([
      'supprimer',
      'validerAttestation',
    ])
    expect(permises(absence({ ...CONGE, statutAttestation: 'VALIDEE' }))).toEqual(['terminer'])
    expect(
      permises(absence({ ...CONGE, statut: 'TERMINE', statutAttestation: 'VALIDEE' }))
    ).toEqual([])
  })
})
