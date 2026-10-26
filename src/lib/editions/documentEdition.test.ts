import { describe, expect, it } from 'vitest'
import { construireHtmlEdition, sectionsEdition } from './documentEdition'
import { colonnesEdition } from './colonnes'
import type { DemandeEdition } from '@/domain/editions/editions'
import { selectionnerEdition } from '@/domain/editions/editions'
import { LARGEUR_NUMERO_MM, LARGEUR_UTILE_MM } from '@/lib/pdf/liste/documentListe'
import { GRILLE_DE_TEST, dossierDeTest, jour } from '@/domain/enseignants/recherche/dossiersDeTest'
import { avecSituation } from '@/domain/enseignants/recherche/selectionner'
import type { AbsenceDossier, DossierEnseignant } from '@/domain/enseignants/dossier'

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

describe('listes d’absences — congés', () => {
  const absence = (surcharge: Partial<AbsenceDossier> = {}): AbsenceDossier => ({
    id: 'a1',
    type: 'CONGE_MATERNITE',
    statut: 'EN_PERIODE',
    dateDebut: jour('2026-09-01'),
    dateFin: jour('2026-12-08'),
    dateRetour: null,
    motif: null,
    ...surcharge,
  })
  const ligneAbsence = (dossier: DossierEnseignant, a: AbsenceDossier) => ({
    ...avecSituation([dossier], GRILLE_DE_TEST)[0]!,
    absence: a,
  })
  const conges = { cle: 'conges' } as const

  it('suit les colonnes du client : début et fin du congé avant l’origine, sans colonne de type', () => {
    expect(
      colonnesEdition(conges)
        .map((c) => c.entete)
        .slice(8)
    ).toEqual([
      'Date de prise de service',
      'Date de début du congé',
      'Date de fin du congé',
      "Région d'origine",
      "Département d'origine",
    ])
  })

  it('le tableur ajoute la colonne « Type de congé », que le PDF dit par un bandeau', () => {
    const entetes = colonnesEdition(conges, 'csv').map((c) => c.entete)
    expect(entetes).toContain('Type de congé')
    expect(entetes.indexOf('Type de congé')).toBe(entetes.indexOf('Date de début du congé') - 1)
    expect(colonnesEdition(conges, 'pdf').map((c) => c.entete)).not.toContain('Type de congé')
  })

  it('imprime les dates du congé au format jj/mm/aaaa', () => {
    const ligne = ligneAbsence(dossierDeTest(), absence())
    const valeur = (entete: string) =>
      colonnesEdition(conges)
        .find((c) => c.entete === entete)!
        .valeur(ligne)
    expect(valeur('Date de début du congé')).toBe('01/09/2026')
    expect(valeur('Date de fin du congé')).toBe('08/12/2026')
  })

  it('sépare maternité et maladie par un bandeau, la numérotation continuant d’un bandeau à l’autre', () => {
    const html = construireHtmlEdition(
      conges,
      [
        ligneAbsence(dossierDeTest({ nom: 'A' }), absence()),
        ligneAbsence(dossierDeTest({ nom: 'B' }), absence({ type: 'CONGE_MALADIE' })),
        ligneAbsence(dossierDeTest({ nom: 'C' }), absence({ type: 'CONGE_MALADIE' })),
      ],
      AUJOURDHUI
    )
    expect(html.indexOf('Congé de maternité')).toBeLessThan(html.indexOf('Congé de maladie'))
    expect(compter(html, /<tr class="ligne-groupe">/g)).toBe(2)
    expect(compter(html, /<tr><td>3<\/td>/g)).toBe(1)
  })

  it('n’imprime pas le bandeau d’un type sans congé', () => {
    const html = construireHtmlEdition(
      conges,
      [ligneAbsence(dossierDeTest(), absence({ type: 'CONGE_MALADIE' }))],
      AUJOURDHUI
    )
    expect(html).toContain('Congé de maladie')
    expect(html).not.toContain('Congé de maternité')
  })

  it('n’imprime jamais le motif d’un congé', () => {
    const html = construireHtmlEdition(
      conges,
      [
        ligneAbsence(
          dossierDeTest(),
          absence({ type: 'CONGE_MALADIE', motif: 'Diagnostic confidentiel' })
        ),
      ],
      AUJOURDHUI
    )
    expect(html).not.toContain('Diagnostic confidentiel')
  })

  it('compte les enseignants, pas les lignes, dans le sous-titre', () => {
    const dossier = dossierDeTest()
    const html = construireHtmlEdition(
      conges,
      [
        ligneAbsence(dossier, absence()),
        ligneAbsence(dossier, absence({ type: 'CONGE_MALADIE', id: 'a2' })),
      ],
      AUJOURDHUI
    )
    expect(html).toContain('maladie — 1 enseignant<')
    expect(compter(html, /<tr><td>\d+<\/td>/g)).toBe(2)
  })
})

describe('listes d’absences — missions', () => {
  const missions = { cle: 'missions' } as const
  const ligneMission = (motif: string | null) => ({
    ...avecSituation([dossierDeTest()], GRILLE_DE_TEST)[0]!,
    absence: {
      id: 'm1',
      type: 'MISSION' as const,
      statut: 'EN_PERIODE' as const,
      dateDebut: jour('2026-10-15'),
      dateFin: jour('2026-11-15'),
      dateRetour: null,
      motif,
    },
  })
  const valeur = (entete: string, ligne: ReturnType<typeof ligneMission>) =>
    colonnesEdition(missions)
      .find((c) => c.entete === entete)!
      .valeur(ligne)

  it('suit les colonnes du client : début, fin et lieu d’accueil avant l’origine', () => {
    expect(
      colonnesEdition(missions)
        .map((c) => c.entete)
        .slice(8)
    ).toEqual([
      'Date de prise de service',
      'Date de début de la mission',
      'Date de fin de la mission',
      "Lieu d'accueil / motif",
      "Région d'origine",
      "Département d'origine",
    ])
  })

  it('imprime les dates et reprend le motif de la mission sur une seule ligne', () => {
    const ligne = ligneMission('  Colloque\n international   à Paris ')
    expect(valeur('Date de début de la mission', ligne)).toBe('15/10/2026')
    expect(valeur('Date de fin de la mission', ligne)).toBe('15/11/2026')
    expect(valeur("Lieu d'accueil / motif", ligne)).toBe('Colloque international à Paris')
  })

  it('reprend l’établissement d’accueil puis l’objet, sans leurs intitulés', () => {
    const ligne = ligneMission("Lieu d'accueil : Université de Douala\nObjet : Jury de thèses")
    expect(valeur("Lieu d'accueil / motif", ligne)).toBe('Université de Douala — Jury de thèses')
  })

  it('laisse la cellule vide quand la mission n’a pas de motif', () => {
    expect(valeur("Lieu d'accueil / motif", ligneMission(null))).toBe('')
  })

  it('échappe le motif dans le PDF', () => {
    const html = construireHtmlEdition(missions, [ligneMission('<b>Paris</b> & Rome')], AUJOURDHUI)
    expect(html).not.toContain('<b>Paris</b>')
    expect(html).toContain('&lt;b&gt;Paris&lt;/b&gt; &amp; Rome')
  })

  it('tient sur la feuille', () => {
    for (const demande of [missions, { cle: 'conges' }] as const) {
      const total = colonnesEdition(demande).reduce(
        (somme, c) => somme + c.largeur,
        LARGEUR_NUMERO_MM
      )
      expect(total / LARGEUR_UTILE_MM).toBeGreaterThan(0.85)
      expect(total / LARGEUR_UTILE_MM).toBeLessThan(1.3)
    }
  })
})
