import { describe, expect, it } from 'vitest'
import { construireHtmlEdition, sectionsEdition } from './documentEdition'
import { colonnesEdition } from './colonnes'
import type { DemandeEdition } from '@/domain/editions/editions'
import { selectionnerEdition } from '@/domain/editions/editions'
import { LARGEUR_NUMERO_MM, LARGEUR_UTILE_MM } from '@/lib/pdf/liste/documentListe'
import { GRILLE_DE_TEST, dossierDeTest, jour } from '@/domain/enseignants/recherche/dossiersDeTest'
import { avecSituation } from '@/domain/enseignants/recherche/selectionner'
import type { DossierEnseignant } from '@/domain/enseignants/dossier'

const DEMANDE: DemandeEdition = { cle: 'retraite', annee: 2027 }
const AUJOURDHUI = jour('2026-10-23')
const etab = (id: string, nom: string) => ({ id, nom, abreviation: id.toUpperCase() })
const FS = etab('fs', 'Faculté des Sciences')
const FALSH = etab('falsh', 'Faculté des Arts, Lettres et Sciences Humaines')

// Professeur né le 24/09/1962 : 65 ans le 24/09/2027.
const retraitable = (surcharge: Partial<DossierEnseignant> = {}) =>
  dossierDeTest({ grade: 'PROFESSEUR', dateNaissance: jour('1962-09-24'), ...surcharge })

const lignes = (...dossiers: DossierEnseignant[]) => avecSituation(dossiers, GRILLE_DE_TEST)

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length

describe('colonnesEdition — retraite', () => {
  const colonnes = colonnesEdition(DEMANDE)

  it('suit l’ordre de la liste du client, la date de retraite avant l’origine', () => {
    expect(colonnes.map((c) => c.entete)).toEqual([
      'Nom et prénom',
      'Date de Naissance',
      'Lieu de Naissance',
      'Matricule solde',
      'Grade',
      'Sexe',
      'Domaine de recherche',
      "Département d'attache",
      'Date de prise de service',
      'Date de retraite',
      "Région d'origine",
      "Département d'origine",
    ])
  })

  it('tient sur la feuille : une colonne de plus ne devient jamais illisible', () => {
    const total = colonnes.reduce((somme, c) => somme + c.largeur, LARGEUR_NUMERO_MM)
    // Le cadre ramène le total à la largeur de la feuille ; au-delà de ~1,3 fois, les colonnes
    // seraient rétrécies au point que les dates ne tiendraient plus d'un bloc.
    expect(total / LARGEUR_UTILE_MM).toBeGreaterThan(0.85)
    expect(total / LARGEUR_UTILE_MM).toBeLessThan(1.3)
  })

  it('abrège le grade et la région sur le papier, les écrit en entier dans le tableur', () => {
    const [ligne] = lignes(retraitable())
    const grade = colonnes.find((c) => c.entete === 'Grade')!
    const region = colonnes.find((c) => c.entete === "Région d'origine")!
    expect(grade.valeur(ligne!)).toBe('PR')
    expect(grade.valeurCsv!(ligne!)).toBe('Professeur')
    expect(region.valeur(ligne!)).toBe('OU')
    expect(region.valeurCsv!(ligne!)).toBe('Ouest')
  })

  it('laisse vides les cellules sans valeur (domaine, origine)', () => {
    const [ligne] = lignes(
      retraitable({ domaineRecherche: null, departementOrigine: null, regionOrigine: null })
    )
    const valeur = (entete: string) => colonnes.find((c) => c.entete === entete)!.valeur(ligne!)
    expect(valeur('Domaine de recherche')).toBe('')
    expect(valeur("Région d'origine")).toBe('')
    expect(valeur("Département d'origine")).toBe('')
  })

  it('imprime la date de retraite au format jj/mm/aaaa', () => {
    const [ligne] = lignes(retraitable())
    expect(colonnes.find((c) => c.entete === 'Date de retraite')!.valeur(ligne!)).toBe('24/09/2027')
  })
})

describe('sectionsEdition', () => {
  const ordre = lignes(
    retraitable({ nom: 'TCHOTSOUA', etablissement: FS }),
    retraitable({ nom: 'ABEGA', etablissement: FALSH }),
    retraitable({ nom: 'FOTSO', etablissement: FS, grade: 'ASSISTANT' })
  )

  it('fait une section par établissement, dans l’ordre alphabétique, sans bandeau de grade', () => {
    const sections = sectionsEdition(DEMANDE, ordre)
    expect(sections.map((s) => s.titre)).toEqual([
      'Faculté des Arts, Lettres et Sciences Humaines',
      'Faculté des Sciences',
    ])
    for (const section of sections) {
      expect(section.groupes).toHaveLength(1)
      expect(section.groupes[0]!.titre).toBeUndefined()
    }
  })

  it('annonce la liste et l’effectif en sous-titre, au singulier comme au pluriel', () => {
    const [arts, sciences] = sectionsEdition(DEMANDE, ordre)
    expect(arts!.sousTitre).toBe('Liste des enseignants à la retraite en 2027 — 1 enseignant')
    expect(sciences!.sousTitre).toBe('Liste des enseignants à la retraite en 2027 — 2 enseignants')
  })

  it('ne légende que les sigles de CET établissement', () => {
    const [arts, sciences] = sectionsEdition(DEMANDE, ordre)
    expect(arts!.legende).toBe('Grades : PR = Professeur. Régions : OU = Ouest.')
    expect(sciences!.legende).toBe(
      'Grades : PR = Professeur ; ASS = Assistant. Régions : OU = Ouest.'
    )
  })
})

describe('construireHtmlEdition', () => {
  it('imprime, pour chaque établissement, son titre, son tableau numéroté et sa légende', () => {
    const html = construireHtmlEdition(
      DEMANDE,
      lignes(
        retraitable({ nom: 'TCHOTSOUA', prenom: 'Michel', etablissement: FS }),
        retraitable({ nom: 'ABEGA', prenom: 'Paul', etablissement: FS }),
        retraitable({ nom: 'NGA', etablissement: FALSH })
      ),
      AUJOURDHUI
    )
    expect(compter(html, /<section class="section-liste">/g)).toBe(2)
    expect(compter(html, /<table>/g)).toBe(2)
    expect(html).toContain('Université de Ngaoundéré — liste éditée le 23/10/2026')
    expect(html).toContain('Liste des enseignants à la retraite en 2027 — 2 enseignants')
    expect(html).toContain('TCHOTSOUA Michel')
    expect(html).toContain('<td class="insecable">24/09/2027</td>')
    expect(compter(html, /<p class="legende">/g)).toBe(2)
  })

  it('numère chaque établissement à partir de 1', () => {
    const html = construireHtmlEdition(
      DEMANDE,
      lignes(
        retraitable({ etablissement: FS }),
        retraitable({ etablissement: FS }),
        retraitable({ etablissement: FALSH })
      ),
      AUJOURDHUI
    )
    // FALSH : 1 ; FS : 1 et 2.
    expect(compter(html, /<tr><td>1<\/td>/g)).toBe(2)
    expect(compter(html, /<tr><td>2<\/td>/g)).toBe(1)
  })

  it('annonce une liste vide au lieu de produire un document sans rien', () => {
    const html = construireHtmlEdition(DEMANDE, [], AUJOURDHUI)
    expect(html).toContain('Aucun enseignant à la retraite en 2027.')
    expect(html).not.toContain('<table>')
  })

  it('échappe tout ce qui vient de la base', () => {
    const html = construireHtmlEdition(
      DEMANDE,
      lignes(
        retraitable({
          nom: '<script>alert(1)</script>',
          prenom: "O'BRIEN & fils",
          etablissement: etab('x', '<img src=x onerror=alert(1)>'),
        })
      ),
      AUJOURDHUI
    )
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('O&#39;BRIEN &amp; fils')
  })

  it('imprime la même liste que la sélection : mêmes enseignants, même ordre', () => {
    const dossiers = [
      retraitable({ nom: 'ZEBRE', dateNaissance: jour('1962-03-01') }),
      retraitable({ nom: 'ALPHA', dateNaissance: jour('1962-11-01') }),
      retraitable({ nom: 'HORS', dateNaissance: jour('1970-01-01') }),
    ]
    const selection = selectionnerEdition(DEMANDE, dossiers, GRILLE_DE_TEST, AUJOURDHUI)
    const html = construireHtmlEdition(DEMANDE, selection, AUJOURDHUI)
    expect(html).not.toContain('HORS')
    expect(html.indexOf('ZEBRE')).toBeLessThan(html.indexOf('ALPHA')) // mars avant novembre
  })
})

describe('colonnesEdition — transférés', () => {
  const colonnes = colonnesEdition({ cle: 'transferes' })

  it('place la date de transfert et l’université d’accueil avant l’origine', () => {
    const entetes = colonnes.map((c) => c.entete)
    expect(entetes.slice(8)).toEqual([
      'Date de prise de service',
      'Date de transfert',
      "Université d'accueil",
      "Région d'origine",
      "Département d'origine",
    ])
  })

  it('imprime la date de fin de service (= transfert) et le lieu enregistrés', () => {
    const [ligne] = lignes(
      dossierDeTest({
        statut: 'TRANSFERE',
        dateFinService: jour('2025-01-15'),
        lieuTransfert: 'Université de Douala',
      })
    )
    const valeur = (entete: string) => colonnes.find((c) => c.entete === entete)!.valeur(ligne!)
    expect(valeur('Date de transfert')).toBe('15/01/2025')
    expect(valeur("Université d'accueil")).toBe('Université de Douala')
  })

  it('laisse les cellules vides quand le dossier ne dit rien', () => {
    const [ligne] = lignes(
      dossierDeTest({ statut: 'TRANSFERE', dateFinService: null, lieuTransfert: null })
    )
    const valeur = (entete: string) => colonnes.find((c) => c.entete === entete)!.valeur(ligne!)
    expect(valeur('Date de transfert')).toBe('')
    expect(valeur("Université d'accueil")).toBe('')
  })
})

describe('colonnesEdition — collaboration', () => {
  const colonnes = colonnesEdition({ cle: 'collaboration' })

  it('garde les deux colonnes de dates du contrat, demandées par le client', () => {
    expect(colonnes.map((c) => c.entete).slice(8, 12)).toEqual([
      'Date de prise de service',
      'Date de début de la collaboration',
      'Date de fin de la collaboration',
      "Région d'origine",
    ])
  })

  it('les laisse vides : la base ne connaît pas ces dates', () => {
    const [ligne] = lignes(dossierDeTest({ contratCollaboration: true }))
    for (const entete of ['Date de début de la collaboration', 'Date de fin de la collaboration']) {
      expect(colonnes.find((c) => c.entete === entete)!.valeur(ligne!)).toBe('')
    }
  })
})

describe.each([
  [{ cle: 'transferes' }, 'Liste des enseignants transférés'],
  [{ cle: 'collaboration' }, 'Liste des enseignants sous contrat de collaboration'],
] as const)('document %j', (demande, titre) => {
  it('tient sur la feuille sans rétrécir les colonnes au point de couper les dates', () => {
    const total = colonnesEdition(demande).reduce(
      (somme, c) => somme + c.largeur,
      LARGEUR_NUMERO_MM
    )
    expect(total / LARGEUR_UTILE_MM).toBeGreaterThan(0.85)
    expect(total / LARGEUR_UTILE_MM).toBeLessThan(1.3)
  })

  it('imprime le titre de la liste et l’effectif de chaque établissement', () => {
    const html = construireHtmlEdition(
      demande,
      lignes(
        dossierDeTest({ etablissement: FS }),
        dossierDeTest({ etablissement: FS }),
        dossierDeTest({ etablissement: FALSH })
      ),
      AUJOURDHUI
    )
    expect(html).toContain(`${titre} — 2 enseignants`)
    expect(html).toContain(`${titre} — 1 enseignant<`)
    expect(compter(html, /<section class="section-liste">/g)).toBe(2)
  })

  it('annonce une liste vide', () => {
    const html = construireHtmlEdition(demande, [], AUJOURDHUI)
    expect(html).toContain('Aucun enseignant')
    expect(html).not.toContain('<table>')
  })
})
