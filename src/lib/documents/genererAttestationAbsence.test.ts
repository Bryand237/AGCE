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
}

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
