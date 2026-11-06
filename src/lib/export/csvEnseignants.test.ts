import { describe, expect, it } from 'vitest'
import { construireCsvSelection, ENTETES_CSV_ENSEIGNANTS } from './csvEnseignants'
import { GRILLE_DE_TEST, dossierDeTest, jour } from '@/domain/enseignants/recherche/dossiersDeTest'
import { avecSituation } from '@/domain/enseignants/recherche/selectionner'
import type { DossierEnseignant } from '@/domain/enseignants/dossier'

const AUJOURDHUI = jour('2026-10-20')

const csv = (...dossiers: DossierEnseignant[]) =>
  construireCsvSelection(avecSituation(dossiers, GRILLE_DE_TEST), AUJOURDHUI)

/** Lignes du CSV sans la marque UTF-8, en cellules (suffisant pour des valeurs sans « ; »). */
const lignes = (texte: string) =>
  texte
    .slice(1)
    .split('\r\n')
    .filter((l) => l !== '')
    .map((l) => l.split(';'))

describe('construireCsvSelection', () => {
  it('commence par la marque UTF-8 et les en-têtes, une ligne par enseignant, aucune ligne perdue', () => {
    const texte = csv(dossierDeTest({ nom: 'A' }), dossierDeTest({ nom: 'B' }))
    expect(texte.charCodeAt(0)).toBe(0xfeff)
    const l = lignes(texte)
    expect(l).toHaveLength(3)
    expect(l[0]).toEqual(ENTETES_CSV_ENSEIGNANTS)
    for (const ligne of l) expect(ligne).toHaveLength(ENTETES_CSV_ENSEIGNANTS.length)
  })

  it('une sélection vide donne les en-têtes seuls', () => {
    expect(lignes(csv())).toHaveLength(1)
  })

  it('écrit la fiche, les dates en jj/mm/aaaa et les valeurs calculées', () => {
    const [, ligne] = lignes(
      csv(
        dossierDeTest({
          matricule: '0652 125K',
          nom: 'MBARGA',
          prenom: 'Alice',
          sexe: 'F',
          dateNaissance: jour('1964-09-24'),
          dateEffetEchelon: jour('2024-07-01'),
          datePriseService: jour('2000-09-01'),
          posteResponsabilite: 'Chef de département',
        })
      )
    )
    const par = (entete: string) => ligne![ENTETES_CSV_ENSEIGNANTS.indexOf(entete)]
    expect(par('Matricule')).toBe('0652 125K')
    expect(par('Nom')).toBe('MBARGA')
    expect(par('Date de naissance')).toBe('24/09/1964')
    expect(par('Grade')).toBe('Professeur')
    expect(par('Statut')).toBe('Actif')
    expect(par('Établissement')).toBe('Faculté des Arts, Lettres et Sciences Humaines')
    expect(par('Date de prise de service')).toBe('01/09/2000')
    expect(par('Date de retraite')).toBe('24/09/2029')
    expect(par('Prochain avancement')).toBe('01/07/2026')
    expect(par('Indice')).toBe('940')
    expect(par('Résident')).toBe('Oui')
    expect(par('Contrat de collaboration')).toBe('Non')
    expect(par('Poste de responsabilité')).toBe('Chef de département')
    expect(par("Région d'origine")).toBe('Ouest')
    expect(par('Téléphone')).toBe('699001122')
    expect(par('Adresse mail')).toBe('alice.mbarga@example.cm')
    expect(par('Absence actuelle')).toBe('')
  })

  it('laisse vides les dates et valeurs qui n’existent pas (transféré, origine inconnue)', () => {
    const [, ligne] = lignes(
      csv(
        dossierDeTest({
          statut: 'TRANSFERE',
          departementOrigine: null,
          regionOrigine: null,
          telephone: null,
          email: null,
          domaineRecherche: null,
        })
      )
    )
    const par = (entete: string) => ligne![ENTETES_CSV_ENSEIGNANTS.indexOf(entete)]
    expect(par('Statut')).toBe('Transféré')
    expect(par('Date de retraite')).toBe('')
    expect(par('Prochain avancement')).toBe('')
    expect(par("Région d'origine")).toBe('')
    expect(par('Téléphone')).toBe('')
    expect(par('Domaine de recherche')).toBe('')
  })

  it('indique « Fin de grade » pour un actif au dernier palier', () => {
    const [, ligne] = lignes(
      csv(
        dossierDeTest({
          position: {
            grade: 'PROFESSEUR',
            ordre: 3,
            classe: 2,
            echelon: 3,
            indice: 1050,
            sousCategorie: null,
          },
        })
      )
    )
    expect(ligne![ENTETES_CSV_ENSEIGNANTS.indexOf('Prochain avancement')]).toBe('Fin de grade')
  })

  it('un retraité garde sa date de fin de service réelle', () => {
    const [, ligne] = lignes(
      csv(dossierDeTest({ statut: 'RETRAITE', dateFinService: jour('2026-03-01') }))
    )
    expect(ligne![ENTETES_CSV_ENSEIGNANTS.indexOf('Date de retraite')]).toBe('01/03/2026')
  })

  it('décrit l’absence en cours et celle dont le retour est attendu', () => {
    const absence = (id: string, dateDebut: string, dateFin: string) => ({
      id,
      type: 'MISSION' as const,
      statut: 'EN_PERIODE' as const,
      dateDebut: jour(dateDebut),
      dateFin: jour(dateFin),
      dateRetour: null,
      motif: null,
    })
    const [, enCours, oublie] = lignes(
      csv(
        dossierDeTest({ absences: [absence('1', '2026-10-01', '2026-12-15')] }),
        dossierDeTest({ absences: [absence('2', '2026-08-01', '2026-09-15')] })
      )
    )
    const colonne = ENTETES_CSV_ENSEIGNANTS.indexOf('Absence actuelle')
    expect(enCours![colonne]).toBe("Mission jusqu'au 15/12/2026")
    expect(oublie![colonne]).toBe('Retour attendu : Mission (fin prévue le 15/09/2026)')
  })

  it('protège un contenu qui ressemble à une formule de tableur', () => {
    const texte = csv(dossierDeTest({ domaineRecherche: '=HYPERLINK("http://exemple.cm")' }))
    expect(texte).toContain(`"'=HYPERLINK(""http://exemple.cm"")"`)
    expect(texte).not.toMatch(/;=HYPERLINK/)
  })

  it('un téléphone international reste lisible', () => {
    expect(csv(dossierDeTest({ telephone: '+237 6 89 45 21 35' }))).toContain(
      ';+237 6 89 45 21 35;'
    )
  })

  it('respecte l’ordre de la sélection', () => {
    const l = lignes(csv(dossierDeTest({ nom: 'ZED' }), dossierDeTest({ nom: 'ABBA' })))
    expect([l[1]![1], l[2]![1]]).toEqual(['ZED', 'ABBA'])
  })
})
