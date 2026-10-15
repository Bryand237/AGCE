import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lireLogo } from './logo'

describe('lireLogo', () => {
  let racine: string

  beforeEach(() => {
    racine = mkdtempSync(join(tmpdir(), 'agce-logo-'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(racine, { recursive: true, force: true })
  })

  it('renvoie le logo en URI de données quand le fichier existe', () => {
    mkdirSync(join(racine, 'reference-docs'))
    writeFileSync(
      join(racine, 'reference-docs', 'logo.jpeg'),
      Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    )

    expect(lireLogo(racine)).toBe('data:image/jpeg;base64,/9j/2Q==')
  })

  it('renvoie null, sans lever d’erreur, quand le dossier reference-docs est absent', () => {
    expect(lireLogo(racine)).toBeNull()
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('renvoie null quand le fichier est vide', () => {
    mkdirSync(join(racine, 'reference-docs'))
    writeFileSync(join(racine, 'reference-docs', 'logo.jpeg'), '')

    expect(lireLogo(racine)).toBeNull()
  })

  it('renvoie null quand logo.jpeg est un dossier (fichier illisible)', () => {
    mkdirSync(join(racine, 'reference-docs', 'logo.jpeg'), { recursive: true })

    expect(lireLogo(racine)).toBeNull()
  })
})
