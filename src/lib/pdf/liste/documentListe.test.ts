import { describe, expect, it } from 'vitest'
import {
  construireHtmlListe,
  largeursEnPourcent,
  LARGEUR_NUMERO_MM,
  type ColonneListe,
  type DocumentListe,
} from './documentListe'

type Ligne = { nom: string; courriel?: string }

const COLONNES: ColonneListe<Ligne>[] = [
  { entete: 'Nom', largeur: 40, valeur: (l) => l.nom },
  { entete: 'Courriel', largeur: 30, coupureDouce: true, valeur: (l) => l.courriel ?? '' },
  { entete: 'Date', largeur: 20, insecable: true, valeur: () => '01/02/2003' },
]

function document(sections: DocumentListe<Ligne>['sections']): DocumentListe<Ligne> {
  return {
    enteteGauche: 'Gauche',
    enteteDroite: 'Droite',
    colonnes: COLONNES,
    sections,
    messageSiVide: 'Rien à imprimer.',
  }
}

const compter = (html: string, motif: RegExp) => (html.match(motif) ?? []).length

describe('largeursEnPourcent', () => {
  it('ramène les largeurs à 100 % exactement, quelles que soient les valeurs', () => {
    for (const largeurs of [
      [7, 25, 14, 16],
      [1, 1, 1],
      [7, 33.3, 41.7, 12.9, 8.1, 27.6],
      [13, 29, 31, 17, 19, 23, 5],
    ]) {
      const somme = largeursEnPourcent(largeurs).reduce((a, b) => a + b, 0)
      expect(Math.round(somme * 1000) / 1000).toBe(100)
    }
  })

  it('garde les proportions', () => {
    expect(largeursEnPourcent([10, 30, 60])).toEqual([10, 30, 60])
    expect(largeursEnPourcent([1, 1])).toEqual([50, 50])
  })
})

describe('construireHtmlListe', () => {
  it('numérote sans repartir à 1 quand on change de groupe, et ajoute la colonne N°', () => {
    const html = construireHtmlListe(
      document([
        {
          titre: 'Faculté A',
          groupes: [
            { titre: 'Professeurs', lignes: [{ nom: 'A' }, { nom: 'B' }] },
            { titre: 'Chargés de Cours', lignes: [{ nom: 'C' }] },
          ],
        },
      ])
    )
    expect(html).toContain('<tr><td>1</td><td>A</td>')
    expect(html).toContain('<tr><td>2</td><td>B</td>')
    expect(html).toContain('<tr><td>3</td><td>C</td>')
    expect(html).toContain('<th>N°</th><th>Nom</th><th>Courriel</th><th>Date</th>')
  })

  it("chaque ligne a autant de cellules que d'en-têtes, N° compris", () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ lignes: [{ nom: 'A' }, { nom: 'B' }] }] }])
    )
    const lignes = html.match(/<tr><td>\d+<\/td>.*?<\/tr>/g) ?? []
    expect(lignes).toHaveLength(2)
    for (const ligne of lignes) expect(compter(ligne, /<td/g)).toBe(COLONNES.length + 1)
    expect(compter(html, /<col /g)).toBe(COLONNES.length + 1)
  })

  it('répartit exactement la largeur de la feuille, « N° » compris', () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ lignes: [{ nom: 'A' }] }] }])
    )
    const parts = [...html.matchAll(/<col style="width:([\d.]+)%">/g)].map((m) => Number(m[1]))
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 1000) / 1000).toBe(100)
    const total = LARGEUR_NUMERO_MM + 40 + 30 + 20
    expect(parts[0]).toBeCloseTo((LARGEUR_NUMERO_MM / total) * 100, 2)
  })

  it('un bandeau de groupe sans titre est omis, et un groupe vide aussi', () => {
    const html = construireHtmlListe(
      document([
        {
          titre: 'F',
          groupes: [{ lignes: [{ nom: 'A' }] }, { titre: 'Vide', lignes: [] }],
        },
      ])
    )
    expect(html).not.toContain('ligne-groupe"')
    expect(html).not.toContain('Vide')
  })

  it('un bandeau de groupe couvre toutes les colonnes', () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ titre: 'Professeurs', lignes: [{ nom: 'A' }] }] }])
    )
    expect(html).toContain(
      `<tr class="ligne-groupe"><td colspan="${COLONNES.length + 1}">Professeurs</td></tr>`
    )
  })

  it('une section par établissement, avec un saut de page entre deux', () => {
    const html = construireHtmlListe(
      document([
        { titre: 'F1', groupes: [{ lignes: [{ nom: 'A' }] }] },
        { titre: 'F2', groupes: [{ lignes: [{ nom: 'B' }] }] },
      ])
    )
    expect(compter(html, /<section class="section-liste">/g)).toBe(2)
    expect(html).toContain('.section-liste + .section-liste { page-break-before: always; }')
  })

  it('omet les sections sans aucune ligne', () => {
    const html = construireHtmlListe(
      document([
        { titre: 'Vide', groupes: [{ titre: 'Professeurs', lignes: [] }] },
        { titre: 'Pleine', groupes: [{ lignes: [{ nom: 'A' }] }] },
      ])
    )
    expect(html).toContain('Pleine')
    expect(html).not.toContain('>Vide<')
  })

  it("annonce que la liste est vide quand il n'y a rien du tout", () => {
    const html = construireHtmlListe(document([{ titre: 'Vide', groupes: [] }]))
    expect(html).toContain('Rien à imprimer.')
    expect(html).toContain('Gauche')
    expect(html).not.toContain('<table')
  })

  it('échappe tout ce qui vient des données : valeurs, titres, en-têtes', () => {
    const html = construireHtmlListe({
      enteteGauche: '<i>g</i>',
      enteteDroite: 'a & b',
      colonnes: [{ entete: '<b>Nom</b>', largeur: 10, valeur: (l: Ligne) => l.nom }],
      sections: [
        {
          titre: '<script>alert(1)</script>',
          sousTitre: '"citation"',
          groupes: [{ titre: '<u>g</u>', lignes: [{ nom: "O'BRIEN <FILS> & co" }] }],
        },
      ],
      messageSiVide: '',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>Nom</b>')
    expect(html).not.toContain('<u>')
    expect(html).not.toContain('<i>')
    expect(html).toContain('O&#39;BRIEN &lt;FILS&gt; &amp; co')
    expect(html).toContain('&quot;citation&quot;')
  })

  it('affiche le sous-titre sous le titre', () => {
    const html = construireHtmlListe(
      document([
        {
          titre: 'F',
          sousTitre: 'Admis à la retraite en 2027',
          groupes: [{ lignes: [{ nom: 'A' }] }],
        },
      ])
    )
    expect(html).toContain('<p class="sous-titre-section">Admis à la retraite en 2027</p>')
  })

  it('imprime la légende sous le tableau, échappée, et rien quand elle est absente ou vide', () => {
    const avec = construireHtmlListe(
      document([
        {
          titre: 'F',
          legende: 'Grades : PR = Professeur <b>',
          groupes: [{ lignes: [{ nom: 'A' }] }],
        },
      ])
    )
    expect(avec).toContain('<p class="legende">Grades : PR = Professeur &lt;b&gt;</p>')
    expect(avec.indexOf('</table>')).toBeLessThan(avec.indexOf('<p class="legende">'))

    for (const legende of [undefined, '']) {
      const sans = construireHtmlListe(
        document([{ titre: 'F', legende, groupes: [{ lignes: [{ nom: 'A' }] }] }])
      )
      expect(sans).not.toContain('<p class="legende">')
    }
  })

  it('les colonnes insécables portent leur classe, les autres non', () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ lignes: [{ nom: 'A' }] }] }])
    )
    expect(html).toContain('<td class="insecable">01/02/2003</td>')
    expect(html).toContain('<td>A</td>')
  })

  it("ajoute des coupures douces après @ et . sans modifier le texte de l'adresse", () => {
    const html = construireHtmlListe(
      document([
        { titre: 'F', groupes: [{ lignes: [{ nom: 'A', courriel: 'jean.dupont@univ.cm' }] }] },
      ])
    )
    expect(html).toContain('<td>jean.<wbr>dupont@<wbr>univ.<wbr>cm</td>')
    expect(html.replace(/<wbr>/g, '')).toContain('jean.dupont@univ.cm')
  })

  it('les coupures douces ne touchent pas aux caractères échappés', () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ lignes: [{ nom: 'A', courriel: "o'brien@x.cm" }] }] }])
    )
    expect(html).toContain('o&#39;brien@<wbr>x.<wbr>cm')
  })

  it("n'enveloppe pas le contenu dans un bloc qui ajouterait une seconde marge", () => {
    const html = construireHtmlListe(
      document([{ titre: 'F', groupes: [{ lignes: [{ nom: 'A' }] }] }])
    )
    expect(html).not.toMatch(/\.page\s*\{[^}]*padding/)
    expect(html).not.toContain('class="page"')
  })
})
