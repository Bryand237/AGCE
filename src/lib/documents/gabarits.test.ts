import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { describe, expect, it } from 'vitest'

// Ici, les VRAIS gabarits sont lus (les autres tests simulent le fichier). Un gabarit réenregistré
// dans Word peut perdre une balise ou la couper en deux morceaux : le document sortirait alors
// sans le numéro ni la date saisis, sans qu'aucune erreur ne le signale.

const DOSSIER = path.join(process.cwd(), 'templates')
const GABARITS = fs.readdirSync(DOSSIER).filter((nom) => nom.endsWith('.docx'))

/** Lit une entrée d'un .docx (un zip) sans dépendance : table centrale, puis en-tête local. */
function lireEntree(zip: Buffer, nom: string): string {
  const fin = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  const nombre = zip.readUInt16LE(fin + 10)
  let position = zip.readUInt32LE(fin + 16)
  for (let i = 0; i < nombre; i++) {
    const methode = zip.readUInt16LE(position + 10)
    const tailleCompressee = zip.readUInt32LE(position + 20)
    const longueurNom = zip.readUInt16LE(position + 28)
    const longueurExtra = zip.readUInt16LE(position + 30)
    const longueurCommentaire = zip.readUInt16LE(position + 32)
    const enTete = zip.readUInt32LE(position + 42)
    if (zip.toString('utf8', position + 46, position + 46 + longueurNom) === nom) {
      const debut = enTete + 30 + zip.readUInt16LE(enTete + 26) + zip.readUInt16LE(enTete + 28)
      const donnees = zip.subarray(debut, debut + tailleCompressee)
      return (methode === 0 ? donnees : zlib.inflateRawSync(donnees)).toString('utf8')
    }
    position += 46 + longueurNom + longueurExtra + longueurCommentaire
  }
  throw new Error(`${nom} est absent du gabarit.`)
}

/** Le texte de chaque « run » Word (<w:t>) du gabarit. */
function textesDesRuns(gabarit: string): string[] {
  const xml = lireEntree(fs.readFileSync(path.join(DOSSIER, gabarit)), 'word/document.xml')
  return [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1] ?? '')
}

describe('gabarits Word', () => {
  it('sont au nombre attendu (un test à compléter si l’on en ajoute un)', () => {
    expect([...GABARITS].sort()).toEqual([
      'attestation-conge-maladie.docx',
      'attestation-conge-maternite.docx',
      'attestation-mission.docx',
      'decision-avancement.docx',
    ])
  })

  describe.each(GABARITS)('%s', (gabarit) => {
    it('porte le numéro de décision et la date de signature', () => {
      const texte = textesDesRuns(gabarit).join('')

      expect(texte).toContain('DECISION N°{numeroDecision}/UN/R/')
      expect(texte).toContain('{dateSignature}')
    })

    it('garde chaque balise dans un seul morceau de texte (un « run »)', () => {
      for (const run of textesDesRuns(gabarit)) {
        // Rien ne doit rester de { ou } une fois les balises entières retirées.
        expect(run.replace(/\{[A-Za-z]+\}/g, '')).not.toMatch(/[{}]/)
      }
    })
  })
})

// Les attestations citent en dur la loi de finances de l'exercice et la circulaire d'exécution
// budgétaire : ces deux visas changent chaque année et se corrigent À LA MAIN dans Word (voir le
// README, « Références légales des attestations »). Ce test ne vérifie pas leur année, qui
// ferait échouer la suite chaque janvier : il vérifie que les trois attestations disent la même
// chose, pour qu'une mise à jour oubliée sur l'une d'elles se voie.
describe('références légales des attestations', () => {
  const ATTESTATIONS = GABARITS.filter((nom) => nom.startsWith('attestation-'))

  function visas(gabarit: string) {
    const texte = textesDesRuns(gabarit).join('')
    return {
      loiDeFinances: texte.match(/la loi n°\s*\S+ du [^,]+, portant loi de finances[^;]*;/)?.[0],
      circulaire: texte.match(/la circulaire n°\s*\S+ du [^,]+,/)?.[0],
    }
  }

  it.each(ATTESTATIONS)('%s cite une loi de finances et une circulaire', (gabarit) => {
    const { loiDeFinances, circulaire } = visas(gabarit)

    expect(loiDeFinances).toMatch(/exercice 20\d\d/)
    expect(circulaire).toBeDefined()
  })

  it('les attestations citent la même loi de finances et la même circulaire', () => {
    const [premiere, ...autres] = ATTESTATIONS.map(visas)

    expect(autres.length).toBeGreaterThan(0)
    for (const visa of autres) expect(visa).toEqual(premiere)
  })
})
