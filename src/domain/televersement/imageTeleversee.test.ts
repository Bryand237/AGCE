import { describe, expect, it } from 'vitest'
import {
  TAILLE_MAX_IMAGE_OCTETS,
  detecterTypeImage,
  erreurImage,
  extensionDuType,
  lireAdresseImage,
  nomFichierImage,
  verifierEmplacement,
} from './imageTeleversee'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10]
// « RIFF », taille sur 4 octets, « WEBP »
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50]
const octets = (valeurs: number[]) => Uint8Array.from(valeurs)

describe('detecterTypeImage : le type vient des octets, pas du nom ni du navigateur', () => {
  it.each([
    ['JPEG', JPEG, 'image/jpeg'],
    ['PNG', PNG, 'image/png'],
    ['WebP', WEBP, 'image/webp'],
  ])('reconnaît un fichier %s', (_nom, contenu, attendu) => {
    expect(detecterTypeImage(octets(contenu))).toBe(attendu)
  })

  it.each([
    ['du HTML', [...Buffer.from('<html><script>alert(1)</script>')]],
    ['un SVG', [...Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')]],
    ['un GIF', [...Buffer.from('GIF89a')]],
    ['un PDF', [...Buffer.from('%PDF-1.7')]],
    ['un fichier vide', []],
    ['une signature PNG tronquée', PNG.slice(0, 5)],
  ])('refuse %s', (_nom, contenu) => {
    expect(detecterTypeImage(octets(contenu))).toBeNull()
  })

  it('refuse un conteneur RIFF qui n’est pas du WebP (un fichier WAV, par exemple)', () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]
    expect(detecterTypeImage(octets(wav))).toBeNull()
  })
})

describe('extensionDuType', () => {
  it('donne l’extension du vrai type', () => {
    expect(extensionDuType('image/jpeg')).toBe('jpg')
    expect(extensionDuType('image/png')).toBe('png')
    expect(extensionDuType('image/webp')).toBe('webp')
  })
})

describe('erreurImage', () => {
  it('accepte une image valide', () => {
    expect(erreurImage(octets(PNG))).toBeNull()
  })

  it('refuse un fichier vide', () => {
    expect(erreurImage(octets([]))).toMatch(/vide/)
  })

  it('refuse un format non accepté, en disant lesquels le sont', () => {
    expect(erreurImage(octets([...Buffer.from('GIF89a....')]))).toMatch(/JPEG, PNG ou WebP/)
  })

  it('accepte exactement la taille maximale et refuse un octet de plus', () => {
    const limite = new Uint8Array(TAILLE_MAX_IMAGE_OCTETS)
    limite.set(PNG)
    expect(erreurImage(limite)).toBeNull()

    const trop = new Uint8Array(TAILLE_MAX_IMAGE_OCTETS + 1)
    trop.set(PNG)
    expect(erreurImage(trop)).toMatch(/trop lourde \(4 Mo au plus\)/)
  })
})

describe('nomFichierImage', () => {
  const MAINTENANT = new Date('2026-10-30T08:09:10.123Z')
  const ID = '50fa0524-42a6-4339-8d14-4ec585508459'

  it('compose <identifiant>-<horodatage>.<extension>', () => {
    expect(nomFichierImage(ID, 'image/webp', MAINTENANT)).toBe(`${ID}-20261030080910123.webp`)
  })

  it('donne un nom différent à chaque instant : une photo remplacée change d’adresse', () => {
    const plusTard = new Date(MAINTENANT.getTime() + 1)
    expect(nomFichierImage(ID, 'image/png', plusTard)).not.toBe(
      nomFichierImage(ID, 'image/png', MAINTENANT)
    )
  })

  it.each(['../secret', 'a/b', 'a b', '', 'x.png', 'é'])(
    'refuse l’identifiant %j (il finit dans un chemin de fichier)',
    (id) => {
      expect(() => nomFichierImage(id, 'image/png', MAINTENANT)).toThrow(/Identifiant invalide/)
    }
  )
})

describe('lireAdresseImage : l’adresse enregistrée en base choisit un fichier à lire ou supprimer', () => {
  it('lit une adresse ancienne (extension fantaisiste comprise) et une adresse neuve', () => {
    expect(lireAdresseImage('/uploads/enseignants/50fa0524-42a6.octet-stream')).toEqual({
      dossier: 'enseignants',
      nom: '50fa0524-42a6.octet-stream',
    })
    expect(lireAdresseImage('/uploads/etablissements/343c2e24-20261030080910123.webp')).toEqual({
      dossier: 'etablissements',
      nom: '343c2e24-20261030080910123.webp',
    })
  })

  it.each([
    null,
    undefined,
    '',
    '/uploads/enseignants',
    '/uploads/enseignants/a.png/extra',
    '/uploads/autre/a.png',
    '/uploads/../../etc/passwd',
    '/uploads/enseignants/..',
    '/uploads/enseignants/../a.png',
    '/uploads/enseignants/.cache',
    '/uploads/enseignants/a..png',
    'uploads/enseignants/a.png',
    '/public/enseignants/a.png',
    'https://exemple.org/uploads/enseignants/a.png',
    '/uploads/enseignants/a%2Fb.png',
  ])('refuse %j', (adresse) => {
    expect(lireAdresseImage(adresse)).toBeNull()
  })
})

describe('verifierEmplacement', () => {
  it('refuse un dossier inconnu, un nom vide ou un nom avec séparateur', () => {
    expect(verifierEmplacement('secrets', 'a.png')).toBeNull()
    expect(verifierEmplacement('enseignants', '')).toBeNull()
    expect(verifierEmplacement('enseignants', undefined)).toBeNull()
    expect(verifierEmplacement('enseignants', 'a\\b.png')).toBeNull()
    expect(verifierEmplacement('enseignants', 'a/b.png')).toBeNull()
  })
})
