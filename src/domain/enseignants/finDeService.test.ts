import { describe, expect, it } from 'vitest'
import { erreurFinDeService } from './finDeService'

const PRISE_DE_SERVICE = new Date('2018-09-01')

describe('erreurFinDeService', () => {
  it('accepte une fin postérieure à la prise de service', () => {
    expect(erreurFinDeService(PRISE_DE_SERVICE, new Date('2026-09-01'))).toBeUndefined()
  })

  it('accepte une fin le jour même de la prise de service', () => {
    expect(erreurFinDeService(PRISE_DE_SERVICE, new Date('2018-09-01'))).toBeUndefined()
  })

  it('refuse une fin antérieure (1900 saisi à la place de 2020), en citant la prise de service', () => {
    expect(erreurFinDeService(PRISE_DE_SERVICE, new Date('1900-01-01'))).toBe(
      'La date de fin de service ne peut pas précéder la prise de service (le 01/09/2018).'
    )
  })
})
