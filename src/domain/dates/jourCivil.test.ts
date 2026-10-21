import { describe, expect, it } from 'vitest'
import {
  ajouterAnnees,
  analyserDateIso,
  anneeDe,
  aujourdhui,
  debutDeJour,
  dernierJourDAnnee,
  formaterDateIso,
  premierJourDAnnee,
} from './jourCivil'

const utc = (a: number, m: number, j: number) => new Date(Date.UTC(a, m - 1, j))

describe('aujourdhui', () => {
  it('renvoie le jour du calendrier local, à minuit UTC', () => {
    // Construit avec les accesseurs locaux : le test ne dépend pas du fuseau de la machine.
    const midiLocal = new Date(2026, 9, 21, 12, 0, 0)
    expect(aujourdhui(midiLocal).toISOString()).toBe('2026-10-21T00:00:00.000Z')
  })

  it('garde le jour local juste après minuit', () => {
    const minuitTrente = new Date(2026, 9, 21, 0, 30, 0)
    expect(aujourdhui(minuitTrente).toISOString()).toBe('2026-10-21T00:00:00.000Z')
  })

  it('garde le jour local juste avant minuit', () => {
    const presDeMinuit = new Date(2026, 9, 21, 23, 59, 59)
    expect(aujourdhui(presDeMinuit).toISOString()).toBe('2026-10-21T00:00:00.000Z')
  })
})

describe('debutDeJour', () => {
  it('ramène un instant au minuit UTC de son jour', () => {
    expect(debutDeJour(new Date('2026-10-21T17:45:12.500Z')).toISOString()).toBe(
      '2026-10-21T00:00:00.000Z'
    )
  })
})

describe('ajouterAnnees', () => {
  it('ajoute des années en gardant le jour et le mois', () => {
    expect(ajouterAnnees(utc(1964, 9, 24), 65).toISOString()).toBe('2029-09-24T00:00:00.000Z')
  })

  it('accepte un nombre négatif', () => {
    expect(ajouterAnnees(utc(2029, 9, 24), -65).toISOString()).toBe('1964-09-24T00:00:00.000Z')
  })

  it('conserve l’heure d’un instant quelconque', () => {
    expect(ajouterAnnees(new Date('2026-10-21T15:30:00.000Z'), 2).toISOString()).toBe(
      '2028-10-21T15:30:00.000Z'
    )
  })

  it('reporte un 29 février sur le 1er mars d’une année non bissextile', () => {
    expect(ajouterAnnees(utc(1964, 2, 29), 65).toISOString()).toBe('2029-03-01T00:00:00.000Z')
    expect(ajouterAnnees(utc(1964, 2, 29), 60).toISOString()).toBe('2024-02-29T00:00:00.000Z')
  })

  it('ne dépend pas du fuseau de la machine (changement d’heure légale entre les deux dates)', () => {
    const ancien = process.env.TZ
    try {
      // New York : 20 mars 1960 était en heure d'hiver, le 20 mars 2015 en heure d'été.
      // Avec setFullYear (heure locale), le résultat tombait la veille à 23 h UTC.
      process.env.TZ = 'America/New_York'
      expect(ajouterAnnees(utc(1960, 3, 20), 55).toISOString()).toBe('2015-03-20T00:00:00.000Z')
    } finally {
      if (ancien === undefined) delete process.env.TZ
      else process.env.TZ = ancien
    }
  })
})

describe('années', () => {
  it('lit l’année en UTC', () => {
    expect(anneeDe(new Date('2026-12-31T23:59:59Z'))).toBe(2026)
    expect(anneeDe(new Date('2027-01-01T00:00:00Z'))).toBe(2027)
  })

  it('donne le premier et le dernier jour d’une année', () => {
    expect(premierJourDAnnee(2027).toISOString()).toBe('2027-01-01T00:00:00.000Z')
    expect(dernierJourDAnnee(2027).toISOString()).toBe('2027-12-31T00:00:00.000Z')
  })
})

describe('analyserDateIso', () => {
  it('lit une date AAAA-MM-JJ à minuit UTC', () => {
    expect(analyserDateIso('2027-03-09')?.toISOString()).toBe('2027-03-09T00:00:00.000Z')
  })

  it('accepte un 29 février bissextile et rejette un autre', () => {
    expect(analyserDateIso('2028-02-29')).toBeDefined()
    expect(analyserDateIso('2027-02-29')).toBeUndefined()
  })

  it.each([
    '',
    'abc',
    '2027-13-01',
    '2027-00-10',
    '2027-04-31',
    '27-03-09',
    '09/03/2027',
    '2027-3-9',
  ])('rejette « %s » sans lever d’erreur', (texte) => {
    expect(analyserDateIso(texte)).toBeUndefined()
  })

  it('rejette les années sur deux chiffres que Date.UTC lirait comme 19xx', () => {
    expect(analyserDateIso('0027-03-09')).toBeUndefined()
  })

  it('ignore les espaces autour', () => {
    expect(analyserDateIso(' 2027-03-09 ')).toBeDefined()
  })
})

describe('formaterDateIso', () => {
  it('écrit AAAA-MM-JJ en UTC', () => {
    expect(formaterDateIso(utc(2027, 3, 9))).toBe('2027-03-09')
    expect(formaterDateIso(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12-31')
  })

  it('est l’inverse de analyserDateIso', () => {
    expect(formaterDateIso(analyserDateIso('1999-02-11')!)).toBe('1999-02-11')
  })
})
