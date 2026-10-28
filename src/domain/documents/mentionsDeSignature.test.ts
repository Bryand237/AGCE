import { describe, expect, it } from 'vitest'
import {
  BLANC_DATE_ATTESTATION,
  BLANC_NUMERO_ATTESTATION,
  BLANC_NUMERO_AVANCEMENT,
  dateSignatureImprimee,
  numeroDecisionImprime,
} from './mentionsDeSignature'

describe('numeroDecisionImprime', () => {
  it('imprime le numéro saisi, sans espaces autour', () => {
    expect(numeroDecisionImprime('0000123', BLANC_NUMERO_AVANCEMENT)).toBe('0000123')
    expect(numeroDecisionImprime('  12/26 ', BLANC_NUMERO_ATTESTATION)).toBe('12/26')
  })

  it.each([undefined, null, '', '   '])(
    'garde le blanc du gabarit quand le numéro est %j',
    (numero) => {
      expect(numeroDecisionImprime(numero, BLANC_NUMERO_AVANCEMENT)).toBe('___________')
      expect(numeroDecisionImprime(numero, BLANC_NUMERO_ATTESTATION)).toBe(
        '--------------------------'
      )
    }
  )
})

describe('dateSignatureImprimee', () => {
  it('écrit la date en toutes lettres, avec « 1er » pour le premier du mois', () => {
    expect(dateSignatureImprimee(new Date('2026-04-14'), BLANC_DATE_ATTESTATION)).toBe(
      '14 avril 2026'
    )
    expect(dateSignatureImprimee(new Date('2026-07-01'), BLANC_DATE_ATTESTATION)).toBe(
      '1er juillet 2026'
    )
  })

  it('lit la date en UTC : celle d’un <input type="date"> ne recule pas d’un jour', () => {
    expect(dateSignatureImprimee(new Date('2026-10-01T00:00:00.000Z'), '')).toBe('1er octobre 2026')
  })

  it.each([undefined, null, new Date('pas une date')])(
    'garde le blanc quand la date est %j',
    (date) => {
      expect(dateSignatureImprimee(date, BLANC_DATE_ATTESTATION)).toBe('________________')
      expect(dateSignatureImprimee(date, '')).toBe('')
    }
  )
})
