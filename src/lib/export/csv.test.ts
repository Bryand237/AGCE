import { describe, expect, it } from 'vitest'
import { celluleCsv, construireCsv, neutraliserFormule } from './csv'

describe('neutraliserFormule', () => {
  it('laisse le texte ordinaire, les téléphones et les nombres intacts', () => {
    for (const valeur of [
      'MBARGA Alice',
      'Chargé de Cours',
      '+237 6 89 45 21 35',
      '+237689452135',
      '-5',
      '(+237) 689-45',
      '',
      'a=b',
      'x@y.cm',
    ]) {
      expect(neutraliserFormule(valeur)).toBe(valeur)
    }
  })

  it('préfixe d’une apostrophe tout ce qu’un tableur lirait comme une formule', () => {
    expect(neutraliserFormule('=HYPERLINK("http://x")')).toBe(`'=HYPERLINK("http://x")`)
    expect(neutraliserFormule('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(neutraliserFormule('+cmd|calc')).toBe("'+cmd|calc")
    expect(neutraliserFormule('-2+3+cmd')).toBe("'-2+3+cmd")
    expect(neutraliserFormule('\tdonnée')).toBe("'\tdonnée")
  })
})

describe('celluleCsv', () => {
  it('met entre guillemets ce qui contient un point-virgule, un guillemet ou un saut de ligne', () => {
    expect(celluleCsv('a;b')).toBe('"a;b"')
    expect(celluleCsv('il dit "oui"')).toBe('"il dit ""oui"""')
    expect(celluleCsv('ligne 1\nligne 2')).toBe('"ligne 1\nligne 2"')
  })

  it('laisse les virgules et les accents tels quels', () => {
    expect(celluleCsv('Yaoundé, Centre')).toBe('Yaoundé, Centre')
  })

  it('neutralise la formule puis protège le résultat', () => {
    expect(celluleCsv('=A1;B1')).toBe(`"'=A1;B1"`)
  })
})

describe('construireCsv', () => {
  it('commence par la marque UTF-8 et sépare par « ; », lignes en CRLF, fin de ligne finale comprise', () => {
    const csv = construireCsv(
      ['Nom', 'Grade'],
      [
        ['MBARGA', 'Professeur'],
        ['ABEGA', 'Assistant'],
      ]
    )
    expect(csv).toBe('﻿Nom;Grade\r\nMBARGA;Professeur\r\nABEGA;Assistant\r\n')
  })

  it('une sélection vide donne seulement l’en-tête', () => {
    expect(construireCsv(['Nom'], [])).toBe('﻿Nom\r\n')
  })

  it('relu par un analyseur CSV simple, les valeurs difficiles reviennent intactes', () => {
    const csv = construireCsv(['a', 'b'], [['x;y', 'dit "oui"\nok']])
    const corps = csv.slice(1).split('\r\n')[1]!
    expect(corps).toBe('"x;y";"dit ""oui""\nok"')
  })
})
