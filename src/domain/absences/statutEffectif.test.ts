import { describe, expect, it } from 'vitest'
import type { StatutAbsence } from '../enseignants/dossier'
import { RANG_STATUT, statutEffectif } from './statutEffectif'

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const AUJOURDHUI = jour('2026-11-01')

describe('statutEffectif', () => {
  describe('ce qui ne dépend pas de la date', () => {
    it.each(['EN_ATTENTE', 'TERMINE'] as const)(
      'laisse « %s » tel quel, même fin passée',
      (statut) => {
        expect(statutEffectif({ statut, dateFin: jour('2026-01-01') }, AUJOURDHUI)).toBe(statut)
      }
    )

    it('laisse une absence en attente telle quelle, même fin passée : elle n’est pas validée', () => {
      expect(
        statutEffectif({ statut: 'EN_ATTENTE', dateFin: jour('2026-10-01') }, AUJOURDHUI)
      ).toBe('EN_ATTENTE')
    })
  })

  describe('absence validée', () => {
    it('est dépassée quand sa fin est passée, sans que rien ait été écrit en base', () => {
      expect(
        statutEffectif({ statut: 'EN_PERIODE', dateFin: jour('2026-10-31') }, AUJOURDHUI)
      ).toBe('DEPASSE')
    })

    it('est encore en période le DERNIER jour', () => {
      expect(
        statutEffectif({ statut: 'EN_PERIODE', dateFin: jour('2026-11-01') }, AUJOURDHUI)
      ).toBe('EN_PERIODE')
    })

    it('est en période tant que la fin n’est pas atteinte', () => {
      expect(
        statutEffectif({ statut: 'EN_PERIODE', dateFin: jour('2026-11-02') }, AUJOURDHUI)
      ).toBe('EN_PERIODE')
    })

    it('devient dépassée le lendemain de la fin, pas avant', () => {
      const absence = { statut: 'EN_PERIODE' as const, dateFin: jour('2026-11-01') }
      expect(statutEffectif(absence, new Date('2026-11-01T23:59:59.999Z'))).toBe('EN_PERIODE')
      expect(statutEffectif(absence, jour('2026-11-02'))).toBe('DEPASSE')
    })

    it('ne se laisse pas tromper par l’heure : minuit UTC du dernier jour ne compte pas encore comme dépassé', () => {
      // L'ancien mécanisme comparait l'instant exact (dateFin < maintenant) : à 1 h du matin au
      // Cameroun, c'est-à-dire minuit UTC, l'absence passait « dépassée » avec son dernier jour.
      const absence = { statut: 'EN_PERIODE' as const, dateFin: jour('2026-11-01') }
      expect(statutEffectif(absence, new Date('2026-11-01T00:00:01.000Z'))).toBe('EN_PERIODE')
    })

    it('lit le jour de la fin même si la date enregistrée porte une heure', () => {
      expect(
        statutEffectif(
          { statut: 'EN_PERIODE', dateFin: new Date('2026-10-31T10:00:00.000Z') },
          AUJOURDHUI
        )
      ).toBe('DEPASSE')
      expect(
        statutEffectif(
          { statut: 'EN_PERIODE', dateFin: new Date('2026-11-01T10:00:00.000Z') },
          AUJOURDHUI
        )
      ).toBe('EN_PERIODE')
    })
  })

  describe('ancienne valeur « dépassée » enregistrée par l’ancien mécanisme', () => {
    it('reste dépassée tant que la fin est passée', () => {
      expect(statutEffectif({ statut: 'DEPASSE', dateFin: jour('2026-10-15') }, AUJOURDHUI)).toBe(
        'DEPASSE'
      )
    })

    it('redevient en période quand la fin a été repoussée depuis', () => {
      expect(statutEffectif({ statut: 'DEPASSE', dateFin: jour('2026-12-01') }, AUJOURDHUI)).toBe(
        'EN_PERIODE'
      )
    })

    it('redevient en période le dernier jour (l’ancien mécanisme l’avait basculée trop tôt)', () => {
      expect(statutEffectif({ statut: 'DEPASSE', dateFin: jour('2026-11-01') }, AUJOURDHUI)).toBe(
        'EN_PERIODE'
      )
    })
  })
})

describe('RANG_STATUT', () => {
  it('range ce qui attend une action avant ce qui est terminé', () => {
    const statuts: StatutAbsence[] = ['TERMINE', 'DEPASSE', 'EN_PERIODE', 'EN_ATTENTE']

    statuts.sort((a, b) => RANG_STATUT[a] - RANG_STATUT[b])

    expect(statuts).toEqual(['EN_ATTENTE', 'EN_PERIODE', 'DEPASSE', 'TERMINE'])
  })
})
