import { describe, expect, it } from 'vitest'
import { correspondALaSituation, ligneCorrespond } from './correspond'
import { filtresVides } from './filtres'
import type { FiltresEnseignants } from './filtres'
import { GRILLE_DE_TEST, dossierDeTest, jour } from './dossiersDeTest'
import { avecSituation } from './selectionner'
import type { DossierEnseignant } from '../dossier'

const AUJOURDHUI = jour('2026-10-20')

const avec = (surcharge: Partial<FiltresEnseignants>): FiltresEnseignants => ({
  ...filtresVides(),
  ...surcharge,
})

/**
 * Le même petit groupe sert à tous les tests. Professeurs retraités à 65 ans ; l'avancement
 * est 2 ans après la date d'effet de l'échelon.
 */
const dossiers: Record<string, DossierEnseignant> = {
  // retraite 20/10/2025 (passée), avancement 01/07/2026 (passé)
  PASSEE: dossierDeTest({
    nom: 'PASSEE',
    dateNaissance: jour('1960-10-20'),
    dateEffetEchelon: jour('2024-07-01'),
  }),
  // retraite 20/10/2026 = aujourd'hui, avancement 20/10/2026 = aujourd'hui
  AUJOURDHUI: dossierDeTest({
    nom: 'AUJOURDHUI',
    dateNaissance: jour('1961-10-20'),
    dateEffetEchelon: jour('2024-10-20'),
  }),
  // retraite 21/10/2026 (demain), avancement 21/10/2026 (demain)
  DEMAIN: dossierDeTest({
    nom: 'DEMAIN',
    dateNaissance: jour('1961-10-21'),
    dateEffetEchelon: jour('2024-10-21'),
  }),
  // retraite 2045, avancement 01/03/2027
  LOIN: dossierDeTest({
    nom: 'LOIN',
    dateNaissance: jour('1980-03-01'),
    dateEffetEchelon: jour('2025-03-01'),
  }),
  // retraité depuis le 01/03/2026 : pas d'avancement
  RETRAITE: dossierDeTest({
    nom: 'RETRAITE',
    statut: 'RETRAITE',
    dateNaissance: jour('1960-01-01'),
    dateFinService: jour('2026-03-01'),
  }),
  // transféré : ni retraite ni avancement
  TRANSFERE: dossierDeTest({ nom: 'TRANSFERE', statut: 'TRANSFERE' }),
  // actif au dernier palier : retraite oui, avancement non
  FINDEGRADE: dossierDeTest({
    nom: 'FINDEGRADE',
    dateNaissance: jour('1975-06-06'),
    position: {
      grade: 'PROFESSEUR',
      ordre: 3,
      classe: 2,
      echelon: 3,
      indice: 1050,
      sousCategorie: null,
    },
  }),
}

const lignes = avecSituation(Object.values(dossiers), GRILLE_DE_TEST)
const retenus = (filtres: FiltresEnseignants, jourCourant = AUJOURDHUI) =>
  lignes.filter((l) => ligneCorrespond(l, filtres, jourCourant)).map((l) => l.dossier.nom)

describe('correspondALaSituation — sans critère', () => {
  it('retient tout le monde, y compris ceux sans date', () => {
    expect(retenus(filtresVides())).toHaveLength(Object.keys(dossiers).length)
  })
})

describe('correspondALaSituation — date de retraite', () => {
  it('« déjà passée » : la date du jour compte comme atteinte', () => {
    expect(retenus(avec({ retraite: { echeance: 'passee' } }))).toEqual([
      'PASSEE',
      'AUJOURDHUI',
      'RETRAITE',
    ])
  })

  it('« à venir » : strictement après aujourd’hui', () => {
    expect(retenus(avec({ retraite: { echeance: 'future' } }))).toEqual([
      'DEMAIN',
      'LOIN',
      'FINDEGRADE',
    ])
  })

  it('un transféré n’a pas de date de retraite : il ne correspond à aucun critère de retraite', () => {
    expect(retenus(avec({ retraite: { echeance: 'passee' } }))).not.toContain('TRANSFERE')
    expect(retenus(avec({ retraite: { echeance: 'future' } }))).not.toContain('TRANSFERE')
    expect(retenus(avec({ retraite: { annee: 2026 } }))).not.toContain('TRANSFERE')
  })

  it('une année rassemble les retraités et les futurs retraités de cette année', () => {
    // 20/10/2026, 21/10/2026 (actifs) et 01/03/2026 (retraité)
    expect(retenus(avec({ retraite: { annee: 2026 } }))).toEqual([
      'AUJOURDHUI',
      'DEMAIN',
      'RETRAITE',
    ])
  })

  it('une plage, bornes comprises', () => {
    expect(retenus(avec({ retraite: { du: jour('2026-10-21'), au: jour('2026-10-21') } }))).toEqual(
      ['DEMAIN']
    )
    expect(retenus(avec({ retraite: { du: jour('2026-10-21') } }))).toEqual([
      'DEMAIN',
      'LOIN',
      'FINDEGRADE',
    ])
  })

  it('l’échéance et l’année se combinent (le ET des deux)', () => {
    expect(retenus(avec({ retraite: { echeance: 'passee', annee: 2026 } }))).toEqual([
      'AUJOURDHUI',
      'RETRAITE',
    ])
    expect(retenus(avec({ retraite: { echeance: 'future', annee: 2026 } }))).toEqual(['DEMAIN'])
  })

  it('un retraité est jugé sur sa date réelle de fin de service', () => {
    // né en 1960 : la date théorique serait 2025 ; il est parti le 01/03/2026
    expect(retenus(avec({ retraite: { annee: 2026 } }))).toContain('RETRAITE')
    expect(retenus(avec({ retraite: { annee: 2025 } }))).not.toContain('RETRAITE')
  })

  it('se combine avec les critères du dossier (statut)', () => {
    expect(retenus(avec({ statuts: ['ACTIF'], retraite: { echeance: 'passee' } }))).toEqual([
      'PASSEE',
      'AUJOURDHUI',
    ])
  })

  it('suit le jour donné', () => {
    expect(retenus(avec({ retraite: { echeance: 'passee' } }), jour('2026-10-19'))).toEqual([
      'PASSEE',
      'RETRAITE',
    ])
  })
})

describe('correspondALaSituation — date d’avancement', () => {
  it('« déjà passée » : avancement échu, aujourd’hui compris', () => {
    expect(retenus(avec({ avancement: { echeance: 'passee' } }))).toEqual(['PASSEE', 'AUJOURDHUI'])
  })

  it('« à venir »', () => {
    expect(retenus(avec({ avancement: { echeance: 'future' } }))).toEqual(['DEMAIN', 'LOIN'])
  })

  it('ni retraité, ni transféré, ni actif au dernier palier : pas de date, pas de correspondance', () => {
    for (const critere of [
      { echeance: 'passee' as const },
      { echeance: 'future' as const },
      { annee: 2026 },
    ]) {
      const noms = retenus(avec({ avancement: critere }))
      expect(noms).not.toContain('RETRAITE')
      expect(noms).not.toContain('TRANSFERE')
      expect(noms).not.toContain('FINDEGRADE')
    }
  })

  it('par année', () => {
    expect(retenus(avec({ avancement: { annee: 2027 } }))).toEqual(['LOIN'])
    expect(retenus(avec({ avancement: { annee: 2026 } }))).toEqual([
      'PASSEE',
      'AUJOURDHUI',
      'DEMAIN',
    ])
  })
})

describe('correspondALaSituation — les deux critères ensemble', () => {
  it('retraite passée ET avancement à venir : personne parmi ces dossiers', () => {
    expect(
      retenus(avec({ retraite: { echeance: 'passee' }, avancement: { echeance: 'future' } }))
    ).toEqual([])
  })

  it('correspondALaSituation ne regarde pas les critères du dossier', () => {
    const [ligne] = avecSituation([dossierDeTest({ sexe: 'F' })], GRILLE_DE_TEST)
    expect(correspondALaSituation(ligne!, avec({ sexe: 'M' }), AUJOURDHUI)).toBe(true)
    expect(ligneCorrespond(ligne!, avec({ sexe: 'M' }), AUJOURDHUI)).toBe(false)
  })
})
