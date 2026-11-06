import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import './champs'

/** Message du premier problème d'une valeur contre un schéma, sans message écrit dans le schéma. */
function message(schema: z.ZodTypeAny, valeur: unknown): string | undefined {
  const resultat = schema.safeParse(valeur)
  return resultat.success ? undefined : resultat.error.issues[0]?.message
}

describe('messages de zod en français', () => {
  it('champ absent', () => {
    expect(message(z.object({ a: z.string() }), {})).toBe('Ce champ est obligatoire.')
  })

  it('type inattendu', () => {
    expect(message(z.string(), 12)).toBe('Valeur invalide.')
  })

  it('date illisible', () => {
    expect(message(z.coerce.date(), 'pas une date')).toBe('Date invalide.')
  })

  it('adresse e-mail mal formée', () => {
    expect(message(z.string().email(), 'abc')).toBe('Adresse e-mail invalide.')
  })

  it('liste de choix laissée sur « Choisir »', () => {
    expect(message(z.enum(['M', 'F']), '')).toBe('Veuillez faire un choix.')
  })

  it('valeur hors liste', () => {
    expect(message(z.enum(['M', 'F']), 'X')).toBe('Valeur non autorisée.')
  })

  it('texte vide ou trop court', () => {
    expect(message(z.string().min(1), '')).toBe('Ce champ est obligatoire.')
    expect(message(z.string().min(3), 'ab')).toBe('Au moins 3 caractères sont attendus.')
  })

  it('texte trop long', () => {
    expect(message(z.string().max(5), 'abcdefgh')).toBe('Au plus 5 caractères sont autorisés.')
  })

  it('un message écrit dans le schéma reste prioritaire', () => {
    expect(message(z.string().min(1, 'Le nom est obligatoire'), '')).toBe('Le nom est obligatoire')
  })
})
