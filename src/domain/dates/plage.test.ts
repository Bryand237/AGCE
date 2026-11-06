import { describe, expect, it } from 'vitest'
import { croiserPlages, dansPlage, periodeRecoupePlage, plageDeLAnnee, plageEstVide } from './plage'

const j = (texte: string) => new Date(`${texte}T00:00:00Z`)

describe('plageEstVide', () => {
  it('est vraie sans aucune borne', () => {
    expect(plageEstVide({})).toBe(true)
    expect(plageEstVide({ du: j('2027-01-01') })).toBe(false)
    expect(plageEstVide({ au: j('2027-01-01') })).toBe(false)
  })
})

describe('dansPlage', () => {
  const annee2027 = plageDeLAnnee(2027)

  it('inclut les deux bornes', () => {
    expect(dansPlage(j('2027-01-01'), annee2027)).toBe(true)
    expect(dansPlage(j('2027-12-31'), annee2027)).toBe(true)
  })

  it('exclut la veille et le lendemain', () => {
    expect(dansPlage(j('2026-12-31'), annee2027)).toBe(false)
    expect(dansPlage(j('2028-01-01'), annee2027)).toBe(false)
  })

  it('compare des jours : l’heure ne compte pas', () => {
    expect(dansPlage(new Date('2027-12-31T22:00:00Z'), annee2027)).toBe(true)
  })

  it('accepte une plage ouverte d’un seul côté', () => {
    expect(dansPlage(j('2030-05-05'), { du: j('2027-01-01') })).toBe(true)
    expect(dansPlage(j('2026-05-05'), { du: j('2027-01-01') })).toBe(false)
    expect(dansPlage(j('1990-05-05'), { au: j('2027-01-01') })).toBe(true)
    expect(dansPlage(j('2028-05-05'), { au: j('2027-01-01') })).toBe(false)
  })

  it('accepte tout, même une date absente, sans borne', () => {
    expect(dansPlage(null, {})).toBe(true)
    expect(dansPlage(j('2027-01-01'), {})).toBe(true)
  })

  it('refuse une date absente dès qu’une borne existe', () => {
    expect(dansPlage(null, annee2027)).toBe(false)
    expect(dansPlage(undefined, { du: j('2027-01-01') })).toBe(false)
  })
})

describe('croiserPlages', () => {
  it('garde la borne la plus restrictive de chaque côté', () => {
    const croisee = croiserPlages(plageDeLAnnee(2027), { du: j('2027-06-01') })
    expect(croisee.du).toEqual(j('2027-06-01'))
    expect(croisee.au).toEqual(j('2027-12-31'))
  })

  it('reprend simplement l’autre plage quand l’une est vide', () => {
    expect(croiserPlages({}, plageDeLAnnee(2027))).toEqual(plageDeLAnnee(2027))
    expect(croiserPlages(plageDeLAnnee(2027), {})).toEqual(plageDeLAnnee(2027))
  })

  it('donne une plage qui n’accepte rien pour deux plages disjointes', () => {
    const croisee = croiserPlages(plageDeLAnnee(2027), plageDeLAnnee(2028))
    expect(dansPlage(j('2027-12-31'), croisee)).toBe(false)
    expect(dansPlage(j('2028-01-01'), croisee)).toBe(false)
  })
})

describe('periodeRecoupePlage', () => {
  const novembre = { du: j('2026-11-01'), au: j('2026-11-30') }

  it('détecte une période entièrement dans la plage', () => {
    expect(periodeRecoupePlage(j('2026-11-10'), j('2026-11-20'), novembre)).toBe(true)
  })

  it('détecte une période qui déborde des deux côtés', () => {
    expect(periodeRecoupePlage(j('2026-10-01'), j('2026-12-31'), novembre)).toBe(true)
  })

  it('compte un seul jour en commun, à chaque extrémité', () => {
    expect(periodeRecoupePlage(j('2026-10-01'), j('2026-11-01'), novembre)).toBe(true)
    expect(periodeRecoupePlage(j('2026-11-30'), j('2027-01-31'), novembre)).toBe(true)
  })

  it('refuse une période qui finit la veille ou commence le lendemain', () => {
    expect(periodeRecoupePlage(j('2026-10-01'), j('2026-10-31'), novembre)).toBe(false)
    expect(periodeRecoupePlage(j('2026-12-01'), j('2026-12-31'), novembre)).toBe(false)
  })

  it('accepte tout sans borne', () => {
    expect(periodeRecoupePlage(j('2026-10-01'), j('2026-10-31'), {})).toBe(true)
  })
})
