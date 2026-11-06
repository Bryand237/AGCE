import { describe, expect, it } from 'vitest'
import { metadonneesManquantes, metadonneesSessionCompletes } from './metadonneesSessionCompletes'

const COMPLETES = {
  referenceLoiFinances: 'Loi n° 2025/012',
  referenceCirculaire: 'Circulaire n° 1877',
  dateSessionCU: new Date('2025-12-22'),
  dateSessionCA: new Date('2026-01-07'),
}

describe('metadonneesManquantes', () => {
  it('ne signale rien quand tout est renseigné', () => {
    expect(metadonneesManquantes(COMPLETES)).toEqual([])
    expect(metadonneesSessionCompletes(COMPLETES)).toBe(true)
  })

  it('liste tout ce qui manque, dans l’ordre du formulaire', () => {
    const vides = {
      referenceLoiFinances: null,
      referenceCirculaire: null,
      dateSessionCU: null,
      dateSessionCA: null,
    }

    expect(metadonneesManquantes(vides)).toEqual([
      'la loi de finances',
      'la circulaire MINFI',
      'la date de la session du CU',
      'la date de la session du CA',
    ])
    expect(metadonneesSessionCompletes(vides)).toBe(false)
  })

  it('ne signale que les champs absents', () => {
    expect(metadonneesManquantes({ ...COMPLETES, referenceCirculaire: null })).toEqual([
      'la circulaire MINFI',
    ])
    expect(metadonneesManquantes({ ...COMPLETES, dateSessionCA: null })).toEqual([
      'la date de la session du CA',
    ])
  })

  it('traite un texte vide comme absent', () => {
    expect(metadonneesManquantes({ ...COMPLETES, referenceLoiFinances: '' })).toEqual([
      'la loi de finances',
    ])
  })
})
