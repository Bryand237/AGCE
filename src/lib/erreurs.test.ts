import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyserErreur, messageErreur, MESSAGE_ERREUR_TECHNIQUE } from './erreurs'

// Les erreurs de Prisma sont reconnues par leur forme (code, meta) : on les fabrique ici
// sans base de données.
const erreurPrisma = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(`erreur ${code}`), {
    name: 'PrismaClientKnownRequestError',
    code,
    ...extra,
  })

describe('analyserErreur', () => {
  it('reconnaît une violation d’unicité et lit les champs dans meta.target', () => {
    const erreur = erreurPrisma('P2002', { meta: { target: ['matricule'] } })

    expect(analyserErreur(erreur)).toEqual({ nature: 'unicite', champs: ['matricule'] })
  })

  it('lit les champs là où l’adaptateur PostgreSQL les place (driverAdapterError)', () => {
    const erreur = erreurPrisma('P2002', {
      meta: {
        modelName: 'Departement',
        driverAdapterError: {
          cause: {
            kind: 'UniqueConstraintViolation',
            constraint: { fields: ['etablissementId', 'nom'] },
          },
        },
      },
    })

    expect(analyserErreur(erreur)).toEqual({
      nature: 'unicite',
      champs: ['etablissementId', 'nom'],
    })
  })

  it('retrouve les champs dans le texte de l’erreur quand meta est vide', () => {
    const erreur = erreurPrisma('P2002', {
      message: 'Unique constraint failed on the fields: (`etablissementId`,`abreviation`)',
    })

    expect(analyserErreur(erreur).champs).toEqual(['etablissementId', 'abreviation'])
  })

  it('reste une violation d’unicité, sans champs, quand rien n’est indiqué', () => {
    expect(analyserErreur(erreurPrisma('P2002'))).toEqual({ nature: 'unicite', champs: [] })
  })

  it.each([
    ['P2025', 'introuvable'],
    ['P2003', 'reference'],
    ['P2028', 'delai'],
    ['P1001', 'base_injoignable'],
    ['P1002', 'base_injoignable'],
    ['P1017', 'base_injoignable'],
    ['P2024', 'base_injoignable'],
  ])('%s est classée « %s »', (code, nature) => {
    expect(analyserErreur(erreurPrisma(code)).nature).toBe(nature)
  })

  it('reconnaît une base injoignable cachée dans la cause de l’erreur', () => {
    const erreur = new Error('échec', {
      cause: Object.assign(new Error('refusé'), { code: 'ECONNREFUSED' }),
    })

    expect(analyserErreur(erreur).nature).toBe('base_injoignable')
  })

  it.each([
    ['une erreur ordinaire', new Error('boum')],
    ['un code Prisma non prévu', erreurPrisma('P2010')],
    ['un texte', 'boum'],
    ['null', null],
    ['undefined', undefined],
  ])('classe %s comme inconnue', (_nom, erreur) => {
    expect(analyserErreur(erreur).nature).toBe('inconnue')
  })
})

describe('messageErreur', () => {
  let erreurConsole: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    erreurConsole = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    erreurConsole.mockRestore()
  })

  describe('doublon (P2002)', () => {
    it('annonce le doublon avec le texte de l’action', () => {
      const erreur = erreurPrisma('P2002', { meta: { target: ['matricule'] } })

      expect(
        messageErreur(erreur, 'creerEnseignant', { unicite: 'Ce matricule existe déjà.' })
      ).toBe('Ce matricule existe déjà.')
    })

    it('choisit le texte du champ en cause', () => {
      const textes = {
        unicite: {
          nom: 'Ce nom est déjà pris.',
          abreviation: 'Cette abréviation est déjà prise.',
          '*': 'Nom ou abréviation déjà pris.',
        },
      }
      const parNom = erreurPrisma('P2002', { meta: { target: ['etablissementId', 'nom'] } })
      const parAbreviation = erreurPrisma('P2002', {
        meta: { target: ['etablissementId', 'abreviation'] },
      })

      expect(messageErreur(parNom, 'creerDepartement', textes)).toBe('Ce nom est déjà pris.')
      expect(messageErreur(parAbreviation, 'creerDepartement', textes)).toBe(
        'Cette abréviation est déjà prise.'
      )
    })

    it('reconnaît un nom de contrainte (Departement_etablissementId_nom_key)', () => {
      const erreur = erreurPrisma('P2002', {
        meta: { target: 'Departement_etablissementId_nom_key' },
      })

      expect(
        messageErreur(erreur, 'creerDepartement', { unicite: { nom: 'Ce nom est déjà pris.' } })
      ).toBe('Ce nom est déjà pris.')
    })

    it('utilise le texte « * » quand le champ n’est pas indiqué', () => {
      const textes = {
        unicite: { nom: 'Ce nom est déjà pris.', '*': 'Nom ou abréviation déjà pris.' },
      }

      expect(messageErreur(erreurPrisma('P2002'), 'creerDepartement', textes)).toBe(
        'Nom ou abréviation déjà pris.'
      )
    })

    it('ne journalise pas : un doublon est un cas normal', () => {
      messageErreur(erreurPrisma('P2002'), 'creerEnseignant')

      expect(erreurConsole).not.toHaveBeenCalled()
    })
  })

  describe('élément disparu (P2025)', () => {
    it('annonce que l’élément n’existe plus, sans parler de doublon', () => {
      const message = messageErreur(erreurPrisma('P2025'), 'marquerRetraite')

      expect(message).toMatch(/n'existe plus/)
      expect(message).not.toMatch(/existe déjà|doublon/i)
      expect(erreurConsole).not.toHaveBeenCalled()
    })

    it('utilise le texte de l’action quand il est fourni', () => {
      expect(
        messageErreur(erreurPrisma('P2025'), 'marquerRetraite', {
          introuvable: 'Enseignant introuvable.',
        })
      ).toBe('Enseignant introuvable.')
    })
  })

  describe('autres causes connues', () => {
    it('base injoignable : message précis, journalisé', () => {
      const message = messageErreur(erreurPrisma('P1001'), 'creerEnseignant', {
        unicite: 'Ce matricule existe déjà.',
      })

      expect(message).toMatch(/base de données est injoignable/)
      expect(message).not.toMatch(/existe déjà/)
      expect(erreurConsole).toHaveBeenCalledTimes(1)
    })

    it('transaction trop longue : message dédié, journalisé', () => {
      expect(messageErreur(erreurPrisma('P2028'), 'validerRapport')).toMatch(/a pris trop de temps/)
      expect(erreurConsole).toHaveBeenCalledTimes(1)
    })

    it('contrainte de référence : message dédié, journalisé', () => {
      expect(messageErreur(erreurPrisma('P2003'), 'supprimerEtablissement')).toMatch(
        /Opération impossible/
      )
      expect(erreurConsole).toHaveBeenCalledTimes(1)
    })
  })

  describe('erreur inattendue', () => {
    it('affiche un message technique neutre, jamais un doublon, et journalise la cause', () => {
      const cause = new Error('connection terminated unexpectedly')

      const message = messageErreur(cause, 'creerEnseignant', {
        unicite: 'Ce matricule existe déjà.',
      })

      expect(message).toBe(MESSAGE_ERREUR_TECHNIQUE)
      expect(message).not.toMatch(/existe déjà/)
      expect(erreurConsole).toHaveBeenCalledWith('creerEnseignant : erreur inattendue', cause)
    })

    it('ne laisse pas fuiter le texte technique de l’exception', () => {
      expect(messageErreur(new Error('relation "Enseignant" does not exist'), 'x')).not.toMatch(
        /relation/
      )
    })
  })

  it('relance les erreurs de navigation de Next.js au lieu de les avaler', () => {
    const redirection = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/connexion;307;',
    })

    expect(() => messageErreur(redirection, 'creerEnseignant')).toThrow(redirection)
    expect(erreurConsole).not.toHaveBeenCalled()
  })
})
