import { describe, expect, it } from 'vitest'
import { versDossier } from './versDossier'
import type { LigneEnseignant } from './versDossier'

const ligne = (surcharge: Partial<LigneEnseignant> = {}): LigneEnseignant => ({
  id: 'e1',
  matricule: '0652125K',
  nom: 'MBARGA',
  prenom: 'Alice',
  photoUrl: null,
  sexe: 'F',
  grade: 'PROFESSEUR',
  statut: 'ACTIF',
  dateNaissance: new Date('1970-03-15T00:00:00Z'),
  lieuNaissance: 'Yaoundé',
  datePriseService: new Date('2000-09-01T00:00:00Z'),
  dateEffetEchelon: new Date('2024-07-01T00:00:00Z'),
  dateFinService: null,
  lieuTransfert: null,
  domaineRecherche: null,
  estResident: true,
  contratCollaboration: false,
  posteResponsabilite: null,
  telephone: '699001122',
  email: 'alice.mbarga@example.cm',
  departement: {
    id: 'd1',
    nom: 'Département de Géographie',
    etablissement: { id: 'f1', nom: 'Faculté des Arts', abreviation: 'FALSH' },
  },
  departementOrigine: { id: 'o1', nom: 'Bamboutos', region: { id: 'r1', nom: 'Ouest' } },
  positionActuelle: {
    grade: 'PROFESSEUR',
    ordre: 1,
    classe: 2,
    echelon: 1,
    indice: 940,
    sousCategorie: null,
  },
  absences: [],
  ...surcharge,
})

describe('versDossier', () => {
  it('remonte l’établissement et la région d’origine au niveau du dossier', () => {
    const dossier = versDossier(ligne())
    expect(dossier.etablissement).toEqual({
      id: 'f1',
      nom: 'Faculté des Arts',
      abreviation: 'FALSH',
    })
    expect(dossier.departement).toEqual({ id: 'd1', nom: 'Département de Géographie' })
    expect(dossier.departementOrigine).toEqual({ id: 'o1', nom: 'Bamboutos' })
    expect(dossier.regionOrigine).toEqual({ id: 'r1', nom: 'Ouest' })
  })

  it('renomme la position actuelle en « position »', () => {
    const dossier = versDossier(ligne())
    expect(dossier.position).toMatchObject({ classe: 2, echelon: 1, indice: 940 })
    expect('positionActuelle' in dossier).toBe(false)
  })

  it('une origine non renseignée donne ni département ni région', () => {
    const dossier = versDossier(ligne({ departementOrigine: null }))
    expect(dossier.departementOrigine).toBeNull()
    expect(dossier.regionOrigine).toBeNull()
  })

  it('conserve les champs simples et les absences', () => {
    const absence = {
      id: 'a1',
      type: 'MISSION' as const,
      statut: 'EN_PERIODE' as const,
      dateDebut: new Date('2026-11-01T00:00:00Z'),
      dateFin: new Date('2026-11-10T00:00:00Z'),
      dateRetour: null,
      motif: 'Paris',
    }
    const dossier = versDossier(ligne({ absences: [absence], matricule: 'X1' }))
    expect(dossier.matricule).toBe('X1')
    expect(dossier.telephone).toBe('699001122')
    expect(dossier.email).toBe('alice.mbarga@example.cm')
    expect(dossier.absences).toEqual([absence])
  })
})
