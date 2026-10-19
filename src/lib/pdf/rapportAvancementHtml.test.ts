import { describe, expect, it } from 'vitest'
import {
  construireHtmlRapport,
  EN_TETE_RAPPORT,
  libellePeriode,
  nomFichierRapport,
  numeroEdition,
  PIED_DE_PAGE_RAPPORT,
  titreEtablissement,
  type DonneesRapport,
  type LigneRapport,
} from './rapportAvancementHtml'

function ligne(surcharge: Partial<LigneRapport> = {}): LigneRapport {
  return {
    nom: 'AKOA',
    prenom: 'Placide',
    matricule: '1134259T',
    diplome: 'Doc. Ph.D',
    grade: 'CHARGE_DE_COURS',
    dateDernierAvancement: new Date('2023-11-26'),
    dernierAvancement: '2C/2E/785',
    dateNouvelAvancement: new Date('2025-11-26'),
    nouvelAvancement: '2C/3E/870',
    observations: '',
    avisCU: false,
    avisCA: false,
    ...surcharge,
  }
}

function rapport(surcharge: Partial<DonneesRapport> = {}): DonneesRapport {
  return {
    numero: '54',
    periodeDebut: new Date('2025-07-01'),
    periodeFin: new Date('2025-12-31'),
    logo: null,
    etablissements: [{ nom: 'Faculté des Arts', abreviation: 'FALSH', lignes: [ligne()] }],
    ...surcharge,
  }
}

/** Les textes des cellules d'une ligne <tr class="enseignant">, dans l'ordre des colonnes. */
function lignesEnseignants(html: string): string[][] {
  return [...html.matchAll(/<tr class="enseignant">([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]!)
  )
}

describe('numeroEdition', () => {
  it.each([
    ['54', '54ème'],
    ['54ème', '54ème'],
    ['54 ème', '54ème'],
    [' 54 ', '54ème'],
    ['54ÈME', '54ème'],
  ])('« %s » → « %s »', (saisi, attendu) => {
    expect(numeroEdition(saisi)).toBe(attendu)
  })
})

describe('libellePeriode', () => {
  it('écrit les mois en capitales, en toutes lettres', () => {
    expect(libellePeriode(new Date('2025-07-01'), new Date('2025-12-31'))).toBe(
      'De JUILLET 2025 à DÉCEMBRE 2025'
    )
  })

  it('lit les mois en UTC : le 1er juillet minuit UTC reste juillet', () => {
    expect(libellePeriode(new Date('2025-07-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).toBe(
      'De JUILLET 2025 à JANVIER 2026'
    )
  })
})

describe('titreEtablissement', () => {
  it('met le nom en capitales et ajoute l’abréviation', () => {
    expect(titreEtablissement('Faculté des Arts, Lettres et Sciences Humaines', 'FALSH')).toBe(
      'FACULTÉ DES ARTS, LETTRES ET SCIENCES HUMAINES (FALSH)'
    )
  })

  it('n’ajoute pas l’abréviation si le nom en porte déjà une', () => {
    expect(titreEtablissement('Faculté des Sciences (FS)', 'FS')).toBe('FACULTÉ DES SCIENCES (FS)')
  })

  it('accepte une abréviation absente', () => {
    expect(titreEtablissement('École normale', null)).toBe('ÉCOLE NORMALE')
  })
})

describe('nomFichierRapport', () => {
  it('retire les accents et les caractères spéciaux', () => {
    expect(nomFichierRapport('55ème')).toBe('rapport-55eme.pdf')
    expect(nomFichierRapport('54 / "bis"')).toBe('rapport-54-bis.pdf')
  })

  it('reste valable pour un numéro sans caractère utilisable', () => {
    expect(nomFichierRapport('«»')).toBe('rapport-avancement.pdf')
  })
})

describe('en-tête et pied de page de chaque page', () => {
  /** Le style doit tenir dans l'attribut : un guillemet double dedans le coupe en deux. */
  function style(modele: string): string {
    const m = /^<div style="([^"]*)">/.exec(modele)
    expect(m, 'l’attribut style doit rester d’un seul tenant').not.toBeNull()
    return m![1]!
  }

  it('porte la référence du service, en haut à droite, avec sa taille de police', () => {
    expect(EN_TETE_RAPPORT).toContain('UN/R/SG/DAAC/DEPE/SSPE')
    expect(style(EN_TETE_RAPPORT)).toMatch(/text-align:right/)
    expect(style(EN_TETE_RAPPORT)).toMatch(/font-size:\d+px/)
  })

  it('numérote « page/total » en bas à droite', () => {
    expect(PIED_DE_PAGE_RAPPORT).toContain('class="pageNumber"')
    expect(PIED_DE_PAGE_RAPPORT).toContain('class="totalPages"')
    expect(style(PIED_DE_PAGE_RAPPORT)).toMatch(/text-align:right/)
    expect(style(PIED_DE_PAGE_RAPPORT)).toMatch(/font-size:\d+px/)
  })
})

describe('construireHtmlRapport : page de garde', () => {
  it('reprend l’en-tête bilingue et le titre du conseil', () => {
    const html = construireHtmlRapport(rapport())

    expect(html).toContain('REPUBLIQUE DU CAMEROUN')
    expect(html).toContain('REPUBLIC OF CAMEROON')
    expect(html).toContain('DIRECTION DES AFFAIRES ACADEMIQUES')
    expect(html).toContain('OFFICE OF ACADEMIC AFFAIRS')
    expect(html).toContain("54ème CONSEIL DE L'UNIVERSITÉ DE NGAOUNDÉRÉ")
    expect(html).toContain('AVANCEMENT INDICIAIRE NORMAL DES ENSEIGNANTS')
    expect(html).toContain('De JUILLET 2025 à DÉCEMBRE 2025')
  })

  it('place le logo quand il existe, et s’en passe sinon', () => {
    expect(construireHtmlRapport(rapport({ logo: 'data:image/jpeg;base64,AAAA' }))).toContain(
      '<img src="data:image/jpeg;base64,AAAA"'
    )
    expect(construireHtmlRapport(rapport({ logo: null }))).not.toContain('<img')
  })

  it('imprime en police serif, comme le rapport papier', () => {
    const html = construireHtmlRapport(rapport())

    expect(html).toMatch(/font-family:[^;]*serif/)
    expect(html).not.toMatch(/font-family:[^;]*Arial/)
  })

  it('échappe le numéro de l’édition', () => {
    expect(construireHtmlRapport(rapport({ numero: '<b>54' }))).not.toContain('<b>54')
  })
})

describe('construireHtmlRapport : tableaux', () => {
  it('fait un tableau par établissement, chacun sur sa page sauf le premier', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          { nom: 'Faculté A', abreviation: 'FA', lignes: [ligne()] },
          { nom: 'Faculté B', abreviation: 'FB', lignes: [ligne()] },
        ],
      })
    )

    expect(html.match(/<table>/g)).toHaveLength(2)
    expect(html.match(/class="etablissement"/g)).toHaveLength(1)
    expect(html.match(/class="etablissement nouvelle-page"/g)).toHaveLength(1)
  })

  it('met le titre de l’établissement dans la première ligne du tableau', () => {
    const html = construireHtmlRapport(rapport())

    expect(html).toMatch(
      /<thead>\s*<tr><th class="titre-etablissement" colspan="11">FACULTÉ DES ARTS \(FALSH\)<\/th><\/tr>/
    )
  })

  it('range les enseignants par grade, puis par nom, avec une numérotation continue', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          {
            nom: 'Faculté A',
            abreviation: 'FA',
            lignes: [
              ligne({ nom: 'ZOGO', grade: 'CHARGE_DE_COURS' }),
              ligne({ nom: 'BELLO', grade: 'PROFESSEUR' }),
              ligne({ nom: 'ABEGA', grade: 'CHARGE_DE_COURS' }),
              ligne({ nom: 'MANGA', grade: 'MAITRE_DE_CONFERENCES' }),
            ],
          },
        ],
      })
    )

    const noms = lignesEnseignants(html).map((c) => `${c[0]} ${c[1]}`)
    expect(noms).toEqual([
      '1 BELLO PLACIDE',
      '2 MANGA PLACIDE',
      '3 ABEGA PLACIDE',
      '4 ZOGO PLACIDE',
    ])
    const sections = [...html.matchAll(/<tr class="ligne-grade"><td[^>]*>([^<]*)</g)].map(
      (m) => m[1]
    )
    expect(sections).toEqual(['PROFESSEURS', 'MAÎTRES DE CONFÉRENCES', 'CHARGÉS DE COURS'])
  })

  it('numérote de nouveau à partir de 1 dans chaque établissement', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          { nom: 'Faculté A', abreviation: 'FA', lignes: [ligne(), ligne({ nom: 'BELLO' })] },
          { nom: 'Faculté B', abreviation: 'FB', lignes: [ligne()] },
        ],
      })
    )

    expect(lignesEnseignants(html).map((c) => c[0])).toEqual(['1', '2', '1'])
  })

  it('affiche matricule espacé, dates jj/mm/aaaa et positions compactes', () => {
    const [cellules] = lignesEnseignants(construireHtmlRapport(rapport()))

    expect(cellules).toEqual([
      '1',
      'AKOA PLACIDE',
      '1134 259T',
      'Doc. Ph.D',
      '26/11/2023',
      '2C/2E/785',
      '26/11/2025',
      '2C/3E/870',
      '',
      '',
      '',
    ])
  })

  it('coche l’avis du CU et du CA seulement quand ils sont donnés', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          {
            nom: 'Faculté A',
            abreviation: 'FA',
            lignes: [
              ligne({ avisCU: true, avisCA: false }),
              ligne({ nom: 'BELLO', avisCU: true, avisCA: true }),
            ],
          },
        ],
      })
    )

    expect(lignesEnseignants(html).map((c) => c.slice(9))).toEqual([
      ['✓', ''],
      ['✓', '✓'],
    ])
  })

  it('n’écarte pas un enseignant dont le grade est inconnu du référentiel', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          { nom: 'Faculté A', abreviation: 'FA', lignes: [ligne({ grade: 'GRADE_INCONNU' })] },
        ],
      })
    )

    expect(lignesEnseignants(html)).toHaveLength(1)
    expect(html).toContain('GRADE_INCONNU')
  })

  it('échappe les noms, diplômes et observations saisis', () => {
    const html = construireHtmlRapport(
      rapport({
        etablissements: [
          {
            nom: 'Faculté A',
            abreviation: 'FA',
            lignes: [
              ligne({
                nom: 'A&B',
                diplome: '<i>PhD</i>',
                observations: '<script>alert(1)</script>',
              }),
            ],
          },
        ],
      })
    )

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<i>PhD</i>')
    expect(html).toContain('A&amp;B PLACIDE')
  })

  it('ne répète pas les en-têtes de colonnes sur les pages de suite, comme le modèle', () => {
    expect(construireHtmlRapport(rapport())).toMatch(/thead\s*\{\s*display:\s*table-row-group/)
  })

  it('produit un document sans tableau quand le rapport est vide', () => {
    const html = construireHtmlRapport(rapport({ etablissements: [] }))

    expect(html).not.toContain('<table>')
    expect(html).toContain('CONSEIL DE L')
  })
})
