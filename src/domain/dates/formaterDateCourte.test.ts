import { describe, expect, it } from 'vitest'
import { formaterDateCourte } from './formaterDateCourte'

describe('formaterDateCourte', () => {
  it('écrit jour/mois/année sur deux chiffres', () => {
    expect(formaterDateCourte(new Date('2026-03-05'))).toBe('05/03/2026')
  })

  it('lit la date en UTC : le premier janvier reste le premier janvier', () => {
    expect(formaterDateCourte(new Date('2026-01-01T00:00:00Z'))).toBe('01/01/2026')
  })
})
