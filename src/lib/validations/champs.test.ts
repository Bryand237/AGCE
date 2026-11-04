import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { date, dateFacultative, texteObligatoire } from './champs'

function messages(schema: z.ZodTypeAny, entree: unknown): string[] {
  const resultat = schema.safeParse(entree)
  return resultat.success ? [] : resultat.error.issues.map((i) => i.message)
}

describe('date', () => {
  const schema = date('La date de validation')

  it.each<[string, unknown]>([
    ['vide', ''],
    ['absente (null, ce que renvoie FormData.get)', null],
    ['non définie', undefined],
    ['illisible', 'demain'],
  ])('refuse une date %s, avec le libellé du champ', (_cas, valeur) => {
    expect(messages(schema, valeur)).toEqual(['La date de validation est invalide ou absente.'])
  })

  it('lit une date saisie à minuit UTC', () => {
    expect(schema.parse('2026-10-01')).toEqual(new Date('2026-10-01T00:00:00.000Z'))
  })
})

describe('dateFacultative', () => {
  const schema = dateFacultative('La date de la correspondance')

  it.each<[string, unknown]>([
    ['vide', ''],
    ['non définie', undefined],
  ])('une date %s vaut undefined', (_cas, valeur) => {
    expect(schema.parse(valeur)).toBeUndefined()
  })

  it('lit une date saisie', () => {
    expect(schema.parse('2026-05-05')).toEqual(new Date('2026-05-05T00:00:00.000Z'))
  })

  it('refuse une date illisible au lieu de l’ignorer', () => {
    expect(messages(schema, 'le 5 mai')).toEqual([
      'La date de la correspondance est invalide ou absente.',
    ])
  })
})

describe('texteObligatoire', () => {
  const schema = texteObligatoire("L'auteur est obligatoire")

  it.each<[string, unknown]>([
    ['vide', ''],
    ['réduit à des espaces', '   '],
    ['absent (undefined)', undefined],
    ['absent (null, ce que renvoie FormData.get)', null],
    ['un fichier envoyé à la place d’un texte', new File(['x'], 'x.txt')],
    ['un nombre', 12],
  ])('refuse un texte %s avec le message du champ', (_cas, valeur) => {
    expect(messages(schema, valeur)).toEqual(["L'auteur est obligatoire"])
  })

  it('retire les espaces autour', () => {
    expect(schema.parse('  Le Recteur ')).toBe('Le Recteur')
  })
})
