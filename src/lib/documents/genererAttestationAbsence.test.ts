import { beforeEach, describe, expect, it, vi } from 'vitest'

// Gabarit Word et publipostage simulés : on vérifie les VALEURS reçues par l'attestation.
const { capture } = vi.hoisted(() => ({
  capture: { fichier: '', donnees: {} as Record<string, unknown> },
}))
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn((chemin: string) => {
      capture.fichier = chemin
      return 'binaire'
    }),
  },
}))
vi.mock('pizzip', () => ({ default: class {} }))
vi.mock('docxtemplater', () => ({
  default: class {
    render(donnees: Record<string, unknown>) {
      capture.donnees = donnees
    }
    toBuffer() {
      return Buffer.from('docx')
    }
  },
}))

const { genererAttestationAbsence } = await import('./genererAttestationAbsence')

const ABSENCE = {
  dateDebut: new Date('2026-04-14'),
  dateFin: new Date('2026-07-28'),
  referenceCorrespondance: 'N° 26-114/UN/DFALSH du 05 mai 2026',
  dateDemandeInteressee: new Date('2026-04-21'),
  motif: null as string | null,
}

const MOTIF_MISSION = "Lieu d'accueil : Université de Douala\nObjet : Jury de soutenance de thèses"
const HOMME = {
  nom: 'Mbarga',
  prenom: 'Paul',
  matricule: '7654321B',
  grade: 'MAITRE_DE_CONFERENCES',
  sexe: 'M',
} as const

function generer(
  type = 'CONGE_MATERNITE',
  surcharge: Partial<Parameters<typeof genererAttestationAbsence>[1]> = {}
) {
  genererAttestationAbsence(type, {
    absence: ABSENCE,
    enseignant: {
      nom: "Bilo'o",
      prenom: 'Brigitte Marie Noel',
      matricule: '1234567A',
      grade: 'ASSISTANT',
      sexe: 'F',
    },
    departement: { nom: "Département d'Histoire" },
    etablissement: { nom: 'Faculté des Arts, Lettres et Sciences Humaines', type: 'FACULTE' },
    ...surcharge,
  })
  return capture.donnees
}

describe('genererAttestationAbsence', () => {
  beforeEach(() => {
    capture.fichier = ''
    capture.donnees = {}
  })

  it('choisit le gabarit selon le type de congé', () => {
    generer('CONGE_MATERNITE')
    expect(capture.fichier).toMatch(/attestation-conge-maternite\.docx$/)

    generer('CONGE_MALADIE')
    expect(capture.fichier).toMatch(/attestation-conge-maladie\.docx$/)

    generer('MISSION')
    expect(capture.fichier).toMatch(/attestation-mission\.docx$/)
  })

  it('refuse un type d’absence sans gabarit', () => {
    expect(() => generer('FORMATION')).toThrow(/Pas encore de template/)
  })

  it('écrit les dates en toutes lettres, comme l’attestation originale', () => {
    const d = generer()

    expect(d.dateDebut).toBe('14 avril 2026')
    expect(d.dateFin).toBe('28 juillet 2026')
    expect(d.dateDemandeInteressee).toBe('21 avril 2026')
  })

  it('écrit « 1er » pour le premier du mois', () => {
    const d = generer('CONGE_MATERNITE', {
      absence: { ...ABSENCE, dateDebut: new Date('2026-07-01') },
    })

    expect(d.dateDebut).toBe('1er juillet 2026')
  })

  it('laisse un blanc quand la date de la demande manque', () => {
    const d = generer('CONGE_MATERNITE', {
      absence: { ...ABSENCE, dateDemandeInteressee: null, referenceCorrespondance: null },
    })

    expect(d.dateDemandeInteressee).toBe('')
    expect(d.referenceCorrespondance).toBe('')
  })

  it('écrit le nom en capitales, avec l’apostrophe typographique', () => {
    expect(generer().nomComplet).toBe('BILO’O BRIGITTE MARIE NOEL')
  })

  it('écrit le département tel qu’enregistré, avec l’apostrophe typographique', () => {
    expect(generer().nomDepartement).toBe('Département d’Histoire')
  })

  it('donne le titre du responsable de l’établissement', () => {
    expect(generer().titreResponsable).toBe('Doyen')
    expect(
      generer('CONGE_MATERNITE', { etablissement: { nom: 'École Normale', type: 'ECOLE' } })
        .titreResponsable
    ).toBe('Directeur')
  })

  it('accorde la civilité au sexe de l’enseignante', () => {
    expect(generer().civilite).toBe('Madame')
  })
})

describe('genererAttestationAbsence — congé de maladie', () => {
  beforeEach(() => {
    capture.fichier = ''
    capture.donnees = {}
  })

  it('donne à la décision les dates du congé et la civilité de l’enseignant', () => {
    const d = generer('CONGE_MALADIE', { enseignant: HOMME })
    expect(d.civilite).toBe('Monsieur')
    expect(d.interesse).toBe('intéressé')
    expect(d.dateDebut).toBe('14 avril 2026')
    expect(d.dateFin).toBe('28 juillet 2026')
  })

  it('accorde « intéressée » au féminin', () => {
    const d = generer('CONGE_MALADIE')
    expect(d.civilite).toBe('Madame')
    expect(d.interesse).toBe('intéressée')
  })
})

describe('genererAttestationAbsence — mission', () => {
  beforeEach(() => {
    capture.fichier = ''
    capture.donnees = {}
  })

  const mission = (surcharge: Partial<Parameters<typeof genererAttestationAbsence>[1]> = {}) =>
    generer('MISSION', { absence: { ...ABSENCE, motif: MOTIF_MISSION }, ...surcharge })

  it('donne à la décision l’établissement d’accueil et l’objet saisis', () => {
    const d = mission()
    expect(d.lieuAccueil).toBe('Université de Douala')
    expect(d.objetMission).toBe('Jury de soutenance de thèses')
  })

  it('imprime les dates de la mission en toutes lettres', () => {
    const d = mission()
    expect(d.dateDebut).toBe('14 avril 2026')
    expect(d.dateFin).toBe('28 juillet 2026')
  })

  it('accorde « intéressée » et « autorisée » au féminin', () => {
    const d = mission()
    expect(d.civilite).toBe('Madame')
    expect(d.interesse).toBe('intéressée')
    expect(d.autorise).toBe('autorisée')
  })

  it('accorde « intéressé » et « autorisé » au masculin', () => {
    const d = mission({ enseignant: HOMME })
    expect(d.civilite).toBe('Monsieur')
    expect(d.interesse).toBe('intéressé')
    expect(d.autorise).toBe('autorisé')
  })

  it('met l’apostrophe typographique dans le lieu d’accueil et dans l’objet', () => {
    const d = mission({
      absence: {
        ...ABSENCE,
        motif: "Lieu d'accueil : Institut d'études\nObjet : Séminaire de l'équipe",
      },
    })
    expect(d.lieuAccueil).toBe('Institut d’études')
    expect(d.objetMission).toBe('Séminaire de l’équipe')
  })

  it('lit un ancien motif libre comme l’objet, sans établissement d’accueil', () => {
    const d = mission({ absence: { ...ABSENCE, motif: 'Colloque à Paris' } })
    expect(d.lieuAccueil).toBe('')
    expect(d.objetMission).toBe('Colloque à Paris')
  })

  it('laisse un blanc quand la mission n’a ni lieu ni objet (la page l’empêche avant)', () => {
    const d = mission({ absence: { ...ABSENCE, motif: null } })
    expect(d.lieuAccueil).toBe('')
    expect(d.objetMission).toBe('')
  })

  it('ne passe pas à un congé les champs de la mission : ils restent vides', () => {
    const d = generer('CONGE_MALADIE')
    expect(d.lieuAccueil).toBe('')
    expect(d.objetMission).toBe('')
  })
})

describe('genererAttestationAbsence — numéro et date de signature', () => {
  beforeEach(() => {
    capture.donnees = {}
  })

  it.each(['CONGE_MATERNITE', 'CONGE_MALADIE', 'MISSION'])(
    'garde les blancs du gabarit pour un brouillon (%s)',
    (type) => {
      const d = generer(
        type,
        type === 'MISSION' ? { absence: { ...ABSENCE, motif: MOTIF_MISSION } } : {}
      )

      expect(d.numeroDecision).toBe('--------------------------')
      expect(d.dateSignature).toBe('________________')
    }
  )

  it.each(['CONGE_MATERNITE', 'CONGE_MALADIE', 'MISSION'])(
    'imprime le numéro saisi et la date de signature en toutes lettres (%s)',
    (type) => {
      const d = generer(type, {
        absence: { ...ABSENCE, motif: MOTIF_MISSION },
        numeroDecision: ' 0412/26 ',
        dateSignature: new Date('2026-10-01'),
      })

      expect(d.numeroDecision).toBe('0412/26')
      expect(d.dateSignature).toBe('1er octobre 2026')
    }
  )

  it('garde les blancs quand le numéro est vide ou la date manque', () => {
    const d = generer('CONGE_MALADIE', { numeroDecision: '  ', dateSignature: null })

    expect(d.numeroDecision).toBe('--------------------------')
    expect(d.dateSignature).toBe('________________')
  })
})
