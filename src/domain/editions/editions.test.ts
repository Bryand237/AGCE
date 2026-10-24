import { describe, expect, it } from 'vitest'
import {
  ANNEE_MAX,
  ANNEE_MIN,
  CLES_EDITION,
  DEFINITIONS_EDITION,
  lireAnneeEdition,
  lireCleEdition,
  lireDemandeEdition,
  messageEditionVide,
  nomFichierEdition,
  selectionnerEdition,
  titreEdition,
  type DemandeEdition,
} from './editions'
import { GRILLE_DE_TEST, dossierDeTest, jour } from '@/domain/enseignants/recherche/dossiersDeTest'

const RETRAITE_2027: DemandeEdition = { cle: 'retraite', annee: 2027 }
const AUJOURDHUI = jour('2026-10-23')

describe('lireAnneeEdition', () => {
  it('accepte une année à quatre chiffres dans les bornes, avec ou sans espaces', () => {
    expect(lireAnneeEdition('2027')).toBe(2027)
    expect(lireAnneeEdition(' 2027 ')).toBe(2027)
    expect(lireAnneeEdition(String(ANNEE_MIN))).toBe(ANNEE_MIN)
    expect(lireAnneeEdition(String(ANNEE_MAX))).toBe(ANNEE_MAX)
  })

  it.each([
    undefined,
    null,
    '',
    ' ',
    'abc',
    '27',
    '202',
    '20277',
    '2027.5',
    '-2027',
    '2e3',
    '0x7E3',
  ])('refuse %j', (valeur) => {
    expect(lireAnneeEdition(valeur)).toBeUndefined()
  })

  it('refuse une année hors des bornes', () => {
    expect(lireAnneeEdition(String(ANNEE_MIN - 1))).toBeUndefined()
    expect(lireAnneeEdition(String(ANNEE_MAX + 1))).toBeUndefined()
  })
})

describe('lireCleEdition', () => {
  it('reconnaît les listes connues et rien d’autre', () => {
    for (const cle of CLES_EDITION) expect(lireCleEdition(cle)).toBe(cle)
    expect(lireCleEdition('inconnue')).toBeUndefined()
    expect(lireCleEdition('')).toBeUndefined()
    expect(lireCleEdition('Retraite')).toBeUndefined()
    expect(lireCleEdition('__proto__')).toBeUndefined()
  })

  it('chaque liste a un titre et une description', () => {
    for (const cle of CLES_EDITION) {
      expect(DEFINITIONS_EDITION[cle].titre.length).toBeGreaterThan(0)
      expect(DEFINITIONS_EDITION[cle].description.length).toBeGreaterThan(0)
    }
  })

  it('la liste de collaboration prévient que les dates du contrat ne sont pas en base', () => {
    expect(DEFINITIONS_EDITION.collaboration.avertissement).toContain('ne sont pas enregistrées')
    expect(DEFINITIONS_EDITION.retraite.avertissement).toBeUndefined()
    expect(DEFINITIONS_EDITION.transferes.avertissement).toBeUndefined()
  })
})

describe('lireDemandeEdition', () => {
  const parametres = (texte: string) => new URLSearchParams(texte)

  it('lit la liste « retraite » avec son année', () => {
    expect(lireDemandeEdition('retraite', parametres('annee=2027'))).toEqual({
      demande: RETRAITE_2027,
    })
  })

  it('refuse une liste inconnue en le disant', () => {
    const lecture = lireDemandeEdition('mystere', parametres('annee=2027'))
    expect(lecture).toEqual({
      erreur: { code: 'EDITION_INCONNUE', message: 'Liste inconnue : « mystere ».' },
    })
  })

  it.each(['', 'annee=', 'annee=abc', 'annee=1800', 'annee=2027.5', 'autre=2027'])(
    'refuse une année absente ou invalide (%j) au lieu de la remplacer',
    (requete) => {
      const lecture = lireDemandeEdition('retraite', parametres(requete))
      expect('erreur' in lecture && lecture.erreur.code).toBe('PARAMETRE_INVALIDE')
      expect('erreur' in lecture && lecture.erreur.message).toContain('Année invalide')
    }
  )

  it.each(['transferes', 'collaboration'] as const)(
    'lit la liste « %s » sans paramètre, et ignore ceux qu’on lui ajoute',
    (cle) => {
      expect(lireDemandeEdition(cle, parametres(''))).toEqual({ demande: { cle } })
      expect(lireDemandeEdition(cle, parametres('annee=abc&page=3'))).toEqual({
        demande: { cle },
      })
    }
  )

  it('prend la première année quand le paramètre est répété', () => {
    expect(lireDemandeEdition('retraite', parametres('annee=2028&annee=2027'))).toEqual({
      demande: { cle: 'retraite', annee: 2028 },
    })
  })
})

describe('titres et noms de fichier', () => {
  it('titre et message de liste vide portent l’année', () => {
    expect(titreEdition(RETRAITE_2027)).toBe('Liste des enseignants à la retraite en 2027')
    expect(messageEditionVide(RETRAITE_2027)).toBe('Aucun enseignant à la retraite en 2027.')
  })

  it('titres, messages de liste vide et noms de fichier des listes sans année', () => {
    const transferes: DemandeEdition = { cle: 'transferes' }
    const collaboration: DemandeEdition = { cle: 'collaboration' }
    expect(titreEdition(transferes)).toBe('Liste des enseignants transférés')
    expect(titreEdition(collaboration)).toBe('Liste des enseignants sous contrat de collaboration')
    expect(messageEditionVide(transferes)).toBe('Aucun enseignant transféré.')
    expect(messageEditionVide(collaboration)).toBe(
      'Aucun enseignant sous contrat de collaboration.'
    )
    expect(nomFichierEdition(transferes, AUJOURDHUI, 'pdf')).toBe(
      'transferes_edition-2026-10-23.pdf'
    )
    expect(nomFichierEdition(collaboration, AUJOURDHUI, 'csv')).toBe(
      'collaboration_edition-2026-10-23.csv'
    )
  })

  it('le nom de fichier porte la liste, l’année et le jour d’édition', () => {
    expect(nomFichierEdition(RETRAITE_2027, AUJOURDHUI, 'pdf')).toBe(
      'retraites-2027_edition-2026-10-23.pdf'
    )
    expect(nomFichierEdition(RETRAITE_2027, AUJOURDHUI, 'csv')).toBe(
      'retraites-2027_edition-2026-10-23.csv'
    )
  })
})

describe('selectionnerEdition — retraite', () => {
  // Professeur : 65 ans ; chargé de cours : 60 ans ; assistant : 55 ans (voir retraite.ts).
  const dossiers = [
    dossierDeTest({ nom: 'PROF', grade: 'PROFESSEUR', dateNaissance: jour('1962-05-10') }), // 2027-05-10
    dossierDeTest({ nom: 'CHARGE', grade: 'CHARGE_DE_COURS', dateNaissance: jour('1967-03-01') }), // 2027-03-01
    dossierDeTest({ nom: 'ASSIST', grade: 'ASSISTANT', dateNaissance: jour('1972-12-31') }), // 2027-12-31
    dossierDeTest({ nom: 'DEBUT', grade: 'CHARGE_DE_COURS', dateNaissance: jour('1967-01-01') }), // 2027-01-01
    dossierDeTest({ nom: 'AVANT', grade: 'PROFESSEUR', dateNaissance: jour('1961-12-31') }), // 2026-12-31
    dossierDeTest({ nom: 'APRES', grade: 'ASSISTANT', dateNaissance: jour('1973-01-01') }), // 2028-01-01
    dossierDeTest({ nom: 'JEUNE', grade: 'PROFESSEUR', dateNaissance: jour('1980-01-01') }), // 2045
    dossierDeTest({
      nom: 'RETRAITE',
      statut: 'RETRAITE',
      grade: 'PROFESSEUR',
      dateNaissance: jour('1955-01-01'),
      dateFinService: jour('2027-02-15'), // date enregistrée : c'est elle qui compte
    }),
    dossierDeTest({
      nom: 'RETRAITE_AUTRE',
      statut: 'RETRAITE',
      grade: 'PROFESSEUR',
      dateNaissance: jour('1962-06-01'), // théorique 2027, mais enregistré en 2026
      dateFinService: jour('2026-06-01'),
    }),
    dossierDeTest({
      nom: 'TRANSFERE',
      statut: 'TRANSFERE',
      grade: 'PROFESSEUR',
      dateNaissance: jour('1962-05-10'), // aurait été 2027 : un transféré n'a pas de retraite ici
    }),
  ]

  const noms = (demande: DemandeEdition) =>
    selectionnerEdition(demande, dossiers, GRILLE_DE_TEST, AUJOURDHUI).map((l) => l.dossier.nom)

  it('garde ceux dont la date de retraite tombe dans l’année, du 1er janvier au 31 décembre', () => {
    expect(noms(RETRAITE_2027)).toEqual(['DEBUT', 'RETRAITE', 'CHARGE', 'PROF', 'ASSIST'])
  })

  it('classe du plus tôt au plus tard dans l’année', () => {
    const dates = selectionnerEdition(RETRAITE_2027, dossiers, GRILLE_DE_TEST, AUJOURDHUI).map(
      (l) => l.situation.dateRetraite!.getTime()
    )
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  })

  it('prend la date enregistrée d’un retraité, pas la date théorique', () => {
    expect(noms({ cle: 'retraite', annee: 2026 })).toEqual(['RETRAITE_AUTRE', 'AVANT'])
    expect(noms(RETRAITE_2027)).toContain('RETRAITE')
    expect(noms(RETRAITE_2027)).not.toContain('RETRAITE_AUTRE')
  })

  it('n’y met jamais un transféré', () => {
    for (const annee of [2026, 2027, 2028, 2045]) {
      expect(noms({ cle: 'retraite', annee })).not.toContain('TRANSFERE')
    }
  })

  it('une année sans départ donne une liste vide', () => {
    expect(noms({ cle: 'retraite', annee: 2099 })).toEqual([])
  })

  it('ne dépend pas du jour d’édition (la liste d’une année est la même toute l’année)', () => {
    const autreJour = selectionnerEdition(
      RETRAITE_2027,
      dossiers,
      GRILLE_DE_TEST,
      jour('2027-06-01')
    ).map((l) => l.dossier.nom)
    expect(autreJour).toEqual(noms(RETRAITE_2027))
  })

  it('à date égale, range par nom', () => {
    const memeJour = [
      dossierDeTest({ nom: 'ZEBRE', grade: 'PROFESSEUR', dateNaissance: jour('1962-05-10') }),
      dossierDeTest({ nom: 'ABEGA', grade: 'PROFESSEUR', dateNaissance: jour('1962-05-10') }),
    ]
    expect(
      selectionnerEdition(RETRAITE_2027, memeJour, GRILLE_DE_TEST, AUJOURDHUI).map(
        (l) => l.dossier.nom
      )
    ).toEqual(['ABEGA', 'ZEBRE'])
  })
})

describe('selectionnerEdition — transférés et contrats de collaboration', () => {
  const dossiers = [
    dossierDeTest({ nom: 'ACTIF', statut: 'ACTIF' }),
    dossierDeTest({
      nom: 'TRANSFERE_B',
      statut: 'TRANSFERE',
      dateFinService: jour('2024-09-01'),
      lieuTransfert: 'Université de Bamenda',
    }),
    dossierDeTest({
      nom: 'TRANSFERE_A',
      statut: 'TRANSFERE',
      dateFinService: jour('2025-01-15'),
      lieuTransfert: 'Université de Douala',
    }),
    dossierDeTest({ nom: 'RETRAITE', statut: 'RETRAITE', dateFinService: jour('2025-06-30') }),
    dossierDeTest({ nom: 'COLLAB_ACTIF', statut: 'ACTIF', contratCollaboration: true }),
    dossierDeTest({
      nom: 'COLLAB_RETRAITE',
      statut: 'RETRAITE',
      dateFinService: jour('2024-01-01'),
      contratCollaboration: true,
    }),
    dossierDeTest({
      nom: 'COLLAB_TRANSFERE',
      statut: 'TRANSFERE',
      dateFinService: jour('2024-02-01'),
      contratCollaboration: true,
    }),
  ]

  const noms = (demande: DemandeEdition) =>
    selectionnerEdition(demande, dossiers, GRILLE_DE_TEST, AUJOURDHUI).map((l) => l.dossier.nom)

  it('« transférés » : tous les transférés, rangés par nom, et eux seuls', () => {
    expect(noms({ cle: 'transferes' })).toEqual(['COLLAB_TRANSFERE', 'TRANSFERE_A', 'TRANSFERE_B'])
  })

  it('« collaboration » : actifs et retraités sous contrat, jamais un transféré', () => {
    expect(noms({ cle: 'collaboration' })).toEqual(['COLLAB_ACTIF', 'COLLAB_RETRAITE'])
  })

  it('ne dépendent pas du jour d’édition', () => {
    for (const demande of [{ cle: 'transferes' }, { cle: 'collaboration' }] as const) {
      const autre = selectionnerEdition(demande, dossiers, GRILLE_DE_TEST, jour('2030-01-01'))
      expect(autre.map((l) => l.dossier.nom)).toEqual(noms(demande))
    }
  })

  it('donnent une liste vide quand personne n’est concerné', () => {
    const seul = [dossierDeTest({ nom: 'ACTIF' })]
    for (const demande of [{ cle: 'transferes' }, { cle: 'collaboration' }] as const) {
      expect(selectionnerEdition(demande, seul, GRILLE_DE_TEST, AUJOURDHUI)).toEqual([])
    }
  })
})
