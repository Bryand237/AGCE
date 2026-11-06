import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enregistrerImage,
  lireImage,
  lireImageTeleversee,
  racineTeleversements,
  supprimerImage,
} from './televersement'

// Ici le disque est RÉEL (un dossier temporaire) : on vérifie ce qui est vraiment écrit, lu et
// supprimé, y compris le repli sur l'ancien emplacement `public/uploads`.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9])
const ID = '50fa0524-42a6-4339-8d14-4ec585508459'

const champ = (octets: Buffer) => ({
  size: octets.length,
  arrayBuffer: async () => new Uint8Array(octets).buffer as ArrayBuffer,
})

describe('téléversements : disque réel', () => {
  let projet: string
  let nouveaux: string
  let anciens: string
  let dossierInitial: string | undefined

  beforeEach(async () => {
    projet = await fs.mkdtemp(path.join(os.tmpdir(), 'agce-televersement-'))
    nouveaux = path.join(projet, 'donnees')
    anciens = path.join(projet, 'public', 'uploads')
    dossierInitial = process.env.UPLOADS_DIR
    process.env.UPLOADS_DIR = nouveaux
    vi.spyOn(process, 'cwd').mockReturnValue(projet)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    if (dossierInitial === undefined) delete process.env.UPLOADS_DIR
    else process.env.UPLOADS_DIR = dossierInitial
    await fs.rm(projet, { recursive: true, force: true })
  })

  async function deposerAncien(dossier: string, nom: string, contenu: Buffer) {
    await fs.mkdir(path.join(anciens, dossier), { recursive: true })
    await fs.writeFile(path.join(anciens, dossier, nom), contenu)
  }

  describe('racineTeleversements', () => {
    it('suit UPLOADS_DIR quand il est défini', () => {
      expect(racineTeleversements()).toBe(nouveaux)
    })

    it('sinon garde public/uploads : une installation existante ne déplace rien', () => {
      delete process.env.UPLOADS_DIR
      expect(racineTeleversements()).toBe(path.join(projet, 'public', 'uploads'))
    })

    it('sans UPLOADS_DIR, écrit, relit puis supprime dans public/uploads', async () => {
      delete process.env.UPLOADS_DIR
      const adresse = await enregistrerImage('enseignants', ID, { octets: PNG, type: 'image/png' })
      const nom = adresse.split('/').pop()!
      expect((await lireImage('enseignants', nom))?.type).toBe('image/png')
      expect(await fs.readdir(path.join(anciens, 'enseignants'))).toEqual([nom])

      await supprimerImage(adresse)

      expect(await fs.readdir(path.join(anciens, 'enseignants'))).toEqual([])
    })
  })

  describe('lireImageTeleversee', () => {
    it('renvoie null quand aucun fichier n’a été choisi', async () => {
      expect(await lireImageTeleversee(null)).toBeNull()
      expect(await lireImageTeleversee('')).toBeNull()
      expect(
        await lireImageTeleversee({ size: 0, arrayBuffer: async () => new ArrayBuffer(0) })
      ).toBeNull()
    })

    it('renvoie les octets et le vrai type d’une image valide', async () => {
      const image = await lireImageTeleversee(champ(JPEG))
      expect(image).toMatchObject({ type: 'image/jpeg' })
      expect(image && 'octets' in image && image.octets.equals(JPEG)).toBe(true)
    })

    it('renvoie une erreur lisible pour un fichier qui n’est pas une image', async () => {
      const image = await lireImageTeleversee(champ(Buffer.from('<html></html>')))
      expect(image).toEqual({ erreur: expect.stringMatching(/Format d'image non accepté/) })
    })
  })

  describe('enregistrerImage', () => {
    it('écrit sous un nom neuf dans le dossier des nouveaux fichiers et renvoie l’adresse', async () => {
      const adresse = await enregistrerImage('enseignants', ID, { octets: PNG, type: 'image/png' })

      expect(adresse).toMatch(new RegExp(`^/uploads/enseignants/${ID}-\\d{17}\\.png$`))
      const nom = adresse.split('/').pop()!
      expect((await fs.readFile(path.join(nouveaux, 'enseignants', nom))).equals(PNG)).toBe(true)
      // Rien n'est écrit dans public/ : il n'est pas inscriptible en production.
      await expect(fs.access(anciens)).rejects.toThrow()
    })

    it('deux envois successifs donnent deux fichiers distincts', async () => {
      const premiere = await enregistrerImage('enseignants', ID, { octets: PNG, type: 'image/png' })
      await new Promise((resolve) => setTimeout(resolve, 5))
      const seconde = await enregistrerImage('enseignants', ID, { octets: PNG, type: 'image/png' })

      expect(seconde).not.toBe(premiere)
      expect(await fs.readdir(path.join(nouveaux, 'enseignants'))).toHaveLength(2)
    })
  })

  describe('lireImage', () => {
    it('relit une image enregistrée, avec son vrai type', async () => {
      const adresse = await enregistrerImage('etablissements', ID, {
        octets: JPEG,
        type: 'image/jpeg',
      })
      const nom = adresse.split('/').pop()!

      const image = await lireImage('etablissements', nom)

      expect(image?.type).toBe('image/jpeg')
      expect(image?.octets.equals(JPEG)).toBe(true)
    })

    it('retrouve un ANCIEN fichier de public/uploads, même à l’extension fantaisiste', async () => {
      await deposerAncien('enseignants', `${ID}.octet-stream`, PNG)

      const image = await lireImage('enseignants', `${ID}.octet-stream`)

      expect(image?.type).toBe('image/png')
    })

    it('préfère le nouvel emplacement quand les deux existent', async () => {
      await deposerAncien('enseignants', 'a.png', PNG)
      await fs.mkdir(path.join(nouveaux, 'enseignants'), { recursive: true })
      await fs.writeFile(path.join(nouveaux, 'enseignants', 'a.png'), JPEG)

      expect((await lireImage('enseignants', 'a.png'))?.type).toBe('image/jpeg')
    })

    it('renvoie null pour un fichier absent', async () => {
      expect(await lireImage('enseignants', 'absent.png')).toBeNull()
    })

    it('ne renvoie jamais un fichier qui n’est pas une image, même nommé « .png »', async () => {
      await fs.mkdir(path.join(nouveaux, 'enseignants'), { recursive: true })
      await fs.writeFile(
        path.join(nouveaux, 'enseignants', 'faux.png'),
        '<script>alert(1)</script>'
      )

      expect(await lireImage('enseignants', 'faux.png')).toBeNull()
    })

    it('refuse de sortir des dossiers d’images', async () => {
      await fs.writeFile(path.join(projet, 'secret.png'), PNG)

      expect(await lireImage('..', 'secret.png')).toBeNull()
      expect(await lireImage('enseignants', '../../secret.png')).toBeNull()
      expect(await lireImage('enseignants', '..%2Fsecret.png')).toBeNull()
      expect(await lireImage('inconnu', 'a.png')).toBeNull()
    })
  })

  describe('supprimerImage', () => {
    it('supprime un fichier du nouvel emplacement', async () => {
      const adresse = await enregistrerImage('enseignants', ID, { octets: PNG, type: 'image/png' })

      await supprimerImage(adresse)

      expect(await fs.readdir(path.join(nouveaux, 'enseignants'))).toEqual([])
    })

    it('supprime aussi un ancien fichier de public/uploads (adresse déjà en base)', async () => {
      await deposerAncien('etablissements', `${ID}.webp`, PNG)

      await supprimerImage(`/uploads/etablissements/${ID}.webp`)

      expect(await fs.readdir(path.join(anciens, 'etablissements'))).toEqual([])
    })

    it('ne fait rien — et ne plante pas — pour un fichier déjà absent ou une adresse vide', async () => {
      await expect(supprimerImage(`/uploads/enseignants/${ID}.png`)).resolves.toBeUndefined()
      await expect(supprimerImage(null)).resolves.toBeUndefined()
      await expect(supprimerImage(undefined)).resolves.toBeUndefined()
    })

    it('ne supprime rien hors des dossiers d’images (adresse en base trafiquée)', async () => {
      const cible = path.join(projet, 'important.png')
      await fs.writeFile(cible, PNG)

      await supprimerImage('/uploads/../important.png')
      await supprimerImage('/uploads/enseignants/../../important.png')

      expect((await fs.readFile(cible)).equals(PNG)).toBe(true)
    })

    it('ne touche pas aux autres fichiers du dossier', async () => {
      await deposerAncien('enseignants', 'garde.png', PNG)
      await deposerAncien('enseignants', 'efface.png', PNG)

      await supprimerImage('/uploads/enseignants/efface.png')

      expect(await fs.readdir(path.join(anciens, 'enseignants'))).toEqual(['garde.png'])
    })
  })
})
