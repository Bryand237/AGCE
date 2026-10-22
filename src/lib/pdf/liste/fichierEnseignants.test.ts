import { describe, expect, it } from 'vitest'
import {
  COLONNES_FICHIER_ENSEIGNANTS,
  construireHtmlFichierEnseignants,
  sectionsFichierEnseignants,
  type EnseignantPourFichier,
  type EtablissementPourFichier,
} from './fichierEnseignants'
import { LARGEUR_NUMERO_MM, LARGEUR_UTILE_MM } from './documentListe'

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

function enseignant(surcharge: Partial<EnseignantPourFichier> = {}): EnseignantPourFichier {
  return {
    matricule: '0650 125J',
    nom: 'NGA',
    prenom: 'Juliette',
    dateNaissance: jour('1980-12-12'),
    lieuNaissance: 'Bertoua',
    sexe: 'F',
    grade: 'CHARGE_DE_COURS',
    domaineRecherche: 'Chimie industrielle',
    datePriseService: jour('2001-10-02'),
    estResident: true,
    contratCollaboration: false,
    posteResponsabilite: 'Chef de département',
    telephone: '689452135',
    email: 'juliette@yahoo.com',
    departementOrigine: { nom: 'Kadey', region: { nom: 'Est' } },
    ...surcharge,
  }
}

const etablissement = (
  nom: string,
  departements: EtablissementPourFichier['departements']
): EtablissementPourFichier => ({ nom, departements })

describe('colonnes du fichier des enseignants', () => {
  it("reprennent les 18 colonnes de la liste officielle, dans l'ordre", () => {
    expect(['N°', ...COLONNES_FICHIER_ENSEIGNANTS.map((c) => c.entete)]).toEqual([
      'N°',
      'Noms et Prénoms',
      'Date de Naissance',
      'Lieu de Naissance',
      'Matricule solde',
      'Grade',
      'Sexe',
      'Domaine de Recherche',
      "Département d'attache",
      'Date de Prise de service',
      'Année de retraite',
      'Résident (Oui/Non)',
      'Contrat de Collaboration',
      "Région d'origine",
      "Département d'origine",
      'Poste de Responsabilité',
      'N° Téléphone',
      'Adresse Mail',
    ])
  })

  it('occupent exactement la largeur de la feuille avec la colonne N° (pas de débordement à droite)', () => {
    const total =
      LARGEUR_NUMERO_MM + COLONNES_FICHIER_ENSEIGNANTS.reduce((somme, c) => somme + c.largeur, 0)
    expect(Math.round(total * 10) / 10).toBe(LARGEUR_UTILE_MM)
  })

  it("gardent d'un seul bloc les dates et le matricule", () => {
    const insecables = COLONNES_FICHIER_ENSEIGNANTS.filter((c) => c.insecable).map((c) => c.entete)
    expect(insecables).toEqual([
      'Date de Naissance',
      'Matricule solde',
      'Date de Prise de service',
      'Année de retraite',
    ])
  })
})

describe('sectionsFichierEnseignants', () => {
  it("mélange les départements, trie par nom puis prénom, et groupe par grade dans l'ordre officiel", () => {
    const sections = sectionsFichierEnseignants([
      etablissement('FALSH', [
        {
          nom: 'Histoire',
          enseignants: [
            enseignant({ nom: 'ZOUA', prenom: 'Paul', grade: 'PROFESSEUR' }),
            enseignant({ nom: 'ABBA', prenom: 'Mohamed', grade: 'CHARGE_DE_COURS' }),
          ],
        },
        {
          nom: 'Sociologie',
          enseignants: [
            enseignant({ nom: 'BOUBA', prenom: 'Zita', grade: 'CHARGE_DE_COURS' }),
            enseignant({ nom: 'BOUBA', prenom: 'Aïcha', grade: 'CHARGE_DE_COURS' }),
            enseignant({ nom: 'DJIROU', prenom: 'Pierre', grade: 'MAITRE_DE_CONFERENCES' }),
          ],
        },
      ]),
    ])
    const [section] = sections
    expect(section?.titre).toBe('FALSH')
    expect(section?.groupes.map((g) => g.titre)).toEqual([
      'Professeurs',
      'Maîtres de Conférences',
      'Chargés de Cours',
      'Assistants',
    ])
    const noms = (i: number) =>
      section?.groupes[i]?.lignes.map((l) => `${l.enseignant.nom} ${l.enseignant.prenom}`)
    expect(noms(0)).toEqual(['ZOUA Paul'])
    expect(noms(1)).toEqual(['DJIROU Pierre'])
    expect(noms(2)).toEqual(['ABBA Mohamed', 'BOUBA Aïcha', 'BOUBA Zita'])
    expect(noms(3)).toEqual([])
  })

  it("retient le département d'attache de chaque enseignant", () => {
    const [section] = sectionsFichierEnseignants([
      etablissement('FS', [
        { nom: 'Chimie', enseignants: [enseignant({ nom: 'A' })] },
        { nom: 'Physique', enseignants: [enseignant({ nom: 'B' })] },
      ]),
    ])
    const lignes = section?.groupes.flatMap((g) => g.lignes) ?? []
    expect(lignes.map((l) => [l.enseignant.nom, l.nomDepartement])).toEqual([
      ['A', 'Chimie'],
      ['B', 'Physique'],
    ])
  })
})

describe('construireHtmlFichierEnseignants', () => {
  it('écrit les valeurs de la fiche, dates en UTC et année de retraite calculée', () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('ENSAI', [{ nom: 'Chimie alimentaire', enseignants: [enseignant()] }]),
    ])
    expect(html).toContain('<td>NGA Juliette</td>')
    expect(html).toContain('<td class="insecable">12/12/1980</td>')
    expect(html).toContain('<td class="insecable">02/10/2001</td>')
    expect(html).toContain('<td class="insecable">0650 125J</td>')
    expect(html).toContain('<td>Chargés de Cours</td>')
    // 1980 + 60 ans (Chargé de Cours)
    expect(html).toContain('<td class="insecable">2040</td>')
    expect(html).toContain('<td>Chimie alimentaire</td>')
    expect(html).toContain('<td>Oui</td><td>Non</td><td>Est</td><td>Kadey</td>')
  })

  it("l'année de retraite et les dates ne dépendent pas du fuseau du serveur (1er janvier)", () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('FS', [
        {
          nom: 'D',
          enseignants: [enseignant({ dateNaissance: jour('1980-01-01'), grade: 'ASSISTANT' })],
        },
      ]),
    ])
    expect(html).toContain('<td class="insecable">01/01/1980</td>')
    // Assistant : 55 ans → 2035, et non 2034 comme avec une lecture en heure locale à l'ouest de l'UTC
    expect(html).toContain('<td class="insecable">2035</td>')
  })

  it("laisse vides l'origine, le domaine, le poste, le téléphone et l'e-mail quand ils manquent", () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('FS', [
        {
          nom: 'D',
          enseignants: [
            enseignant({
              domaineRecherche: null,
              posteResponsabilite: null,
              telephone: null,
              email: null,
              departementOrigine: null,
            }),
          ],
        },
      ]),
    ])
    // domaine vide entre le sexe et le département d'attache…
    expect(html).toContain('<td>F</td><td></td><td>D</td>')
    // … puis région, département d'origine, poste, téléphone et e-mail vides à la suite
    expect(html).toContain('<td>Non</td><td></td><td></td><td></td><td></td><td></td></tr>')
    expect(html).not.toContain('null')
    expect(html).not.toContain('undefined')
  })

  it('échappe les noms avec & < > et apostrophes', () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('École <X> & Y', [
        { nom: 'D', enseignants: [enseignant({ nom: "O'BRIEN & <FILS>" })] },
      ]),
    ])
    expect(html).toContain('O&#39;BRIEN &amp; &lt;FILS&gt; Juliette')
    expect(html).toContain('École &lt;X&gt; &amp; Y')
    expect(html).not.toContain('<FILS>')
  })

  it("omet un établissement sans enseignant et annonce une liste vide s'il n'en reste aucun", () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('Vide', [{ nom: 'D', enseignants: [] }]),
    ])
    expect(html).not.toContain('<table')
    expect(html).toContain('Aucun enseignant à afficher.')
  })

  it("met une page par établissement et l'en-tête officiel en haut de chacune", () => {
    const html = construireHtmlFichierEnseignants([
      etablissement('E1', [{ nom: 'D', enseignants: [enseignant()] }]),
      etablissement('E2', [{ nom: 'D', enseignants: [enseignant()] }]),
    ])
    expect((html.match(/<section class="section-liste">/g) ?? []).length).toBe(2)
    expect(
      (html.match(/Fichier des enseignants de l&#39;Université de Ngaoundéré/g) ?? []).length
    ).toBe(2)
    expect((html.match(/UN\/R\/VR-EPDTIC\/SG\/DAAC\/DEPE\/SSPE/g) ?? []).length).toBe(2)
  })
})
