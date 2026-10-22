import { describe, expect, it } from 'vitest'
import { lireFiltres, parametresDepuisUrl } from './lireFiltres'
import { adresseRaccourci, raccourciActif, raccourcisDisponibles } from './raccourcis'
import { GRILLE_DE_TEST, dossierDeTest, jour } from './dossiersDeTest'
import { selectionnerDossiers } from './selectionner'
import { versParametres } from './versParametres'

const AUJOURDHUI = jour('2026-10-20')
const raccourcis = raccourcisDisponibles(AUJOURDHUI)
const raccourci = (id: string) => raccourcis.find((r) => r.id === id)!

describe('raccourcisDisponibles', () => {
  it('propose retraite, retraités et avancement, avec l’année du jour et la suivante', () => {
    expect(raccourcis.map((r) => r.libelle)).toEqual([
      'Retraite dépassée',
      'Retraite 2026',
      'Retraite 2027',
      'Retraités',
      'Avancement échu',
      'Avancement 2026',
      'Avancement 2027',
    ])
  })

  it('l’année suit le jour courant', () => {
    const libelles = raccourcisDisponibles(jour('2031-01-02')).map((r) => r.libelle)
    expect(libelles).toContain('Retraite 2031')
    expect(libelles).toContain('Avancement 2032')
  })

  it('chaque raccourci a un identifiant unique et une aide', () => {
    expect(new Set(raccourcis.map((r) => r.id)).size).toBe(raccourcis.length)
    for (const r of raccourcis) expect(r.description.length).toBeGreaterThan(10)
  })

  it('chaque adresse relue donne exactement les filtres du raccourci', () => {
    for (const r of raccourcis) {
      const adresse = adresseRaccourci(r)
      const parametres = new URLSearchParams(adresse.split('?')[1] ?? '')
      expect(lireFiltres(parametresDepuisUrl(parametres))).toEqual(r.filtres)
    }
  })

  it('les adresses sont celles du moteur (aucun lien assemblé à la main)', () => {
    expect(adresseRaccourci(raccourci('retraite-depassee'))).toBe(
      '/enseignants?statut=ACTIF&retraiteEcheance=passee&trier=retraite'
    )
    expect(adresseRaccourci(raccourci('retraite-annee'))).toBe(
      '/enseignants?retraiteAnnee=2026&trier=retraite'
    )
    expect(adresseRaccourci(raccourci('retraites'))).toBe(
      '/enseignants?statut=RETRAITE&trier=retraite&ordre=desc'
    )
    expect(adresseRaccourci(raccourci('avancement-echu'))).toBe(
      '/enseignants?statut=ACTIF&avancementEcheance=passee&trier=avancement'
    )
  })
})

describe('raccourcis — ce qu’ils sélectionnent', () => {
  const dossiers = [
    dossierDeTest({
      nom: 'DEPASSE',
      dateNaissance: jour('1958-02-02'),
      dateEffetEchelon: jour('2024-07-01'),
    }),
    dossierDeTest({
      nom: 'CETTEANNEE',
      dateNaissance: jour('1961-12-01'),
      dateEffetEchelon: jour('2025-12-01'),
    }),
    dossierDeTest({
      nom: 'ANNEEPROCHAINE',
      dateNaissance: jour('1962-04-04'),
      dateEffetEchelon: jour('2025-04-04'),
    }),
    dossierDeTest({ nom: 'RETRAITE2026', statut: 'RETRAITE', dateFinService: jour('2026-02-01') }),
    dossierDeTest({ nom: 'RETRAITE2020', statut: 'RETRAITE', dateFinService: jour('2020-02-01') }),
  ]
  const noms = (id: string) =>
    selectionnerDossiers(dossiers, raccourci(id).filtres, GRILLE_DE_TEST, AUJOURDHUI).map(
      (l) => l.dossier.nom
    )

  it('Retraite dépassée : les actifs seuls, du plus ancien au plus récent', () => {
    expect(noms('retraite-depassee')).toEqual(['DEPASSE'])
  })

  it('Retraite 2026 : ceux qui partent et ceux déjà partis cette année-là', () => {
    expect(noms('retraite-annee')).toEqual(['RETRAITE2026', 'CETTEANNEE'])
  })

  it('Retraite 2027', () => {
    expect(noms('retraite-annee-suivante')).toEqual(['ANNEEPROCHAINE'])
  })

  it('Retraités : les plus récents d’abord', () => {
    expect(noms('retraites')).toEqual(['RETRAITE2026', 'RETRAITE2020'])
  })

  it('Avancement échu, puis par année', () => {
    expect(noms('avancement-echu')).toEqual(['DEPASSE'])
    expect(noms('avancement-annee')).toEqual(['DEPASSE'])
    // avril 2027 avant décembre 2027 : le tri suit la date d'avancement
    expect(noms('avancement-annee-suivante')).toEqual(['ANNEEPROCHAINE', 'CETTEANNEE'])
  })
})

describe('raccourciActif', () => {
  const r = raccourci('retraite-depassee')

  it('actif quand les filtres sont exactement les siens', () => {
    expect(raccourciActif(r, r.filtres)).toBe(true)
  })

  it('reste actif quand on retrie ou qu’on change de page', () => {
    expect(raccourciActif(r, { ...r.filtres, tri: 'nom', ordre: 'desc', page: 4 })).toBe(true)
  })

  it('n’est plus actif dès qu’un filtre est ajouté ou retiré', () => {
    expect(raccourciActif(r, { ...r.filtres, sexe: 'F' })).toBe(false)
    expect(raccourciActif(r, { ...r.filtres, statuts: [] })).toBe(false)
    expect(raccourciActif(r, lireFiltres({}))).toBe(false)
  })

  it('un seul raccourci est actif à la fois', () => {
    for (const choisi of raccourcis) {
      const actifs = raccourcis.filter((autre) => raccourciActif(autre, choisi.filtres))
      expect(actifs.map((a) => a.id)).toEqual([choisi.id])
    }
  })

  it('les paramètres de tri ne comptent pas dans la comparaison', () => {
    expect(versParametres(r.filtres).get('trier')).toBe('retraite')
    expect(raccourciActif(r, { ...r.filtres, tri: 'grade' })).toBe(true)
  })
})
