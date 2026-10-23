import { prisma } from '@/lib/prisma'
import type { PalierIndiciaire } from '@/domain/avancement/calculerProchainEchelon'
import type { DossierEnseignant } from '@/domain/enseignants/dossier'
import type { ReferentielsFiltres } from '@/domain/enseignants/recherche/puces'
import { versDossier } from './versDossier'

/**
 * Tous les enseignants, avec ce qu'il faut pour filtrer, trier, afficher et imprimer.
 *
 * Une seule requête, sans filtre SQL : à l'échelle de l'université (quelques centaines de
 * dossiers), filtrer en mémoire est instantané et garantit que l'écran, le PDF et les exports
 * appliquent exactement les mêmes règles, y compris pour les valeurs calculées (date de
 * retraite, prochain avancement) qui n'existent pas en base.
 */
export async function chargerDossiers(): Promise<DossierEnseignant[]> {
  const enseignants = await prisma.enseignant.findMany({
    select: {
      id: true,
      matricule: true,
      nom: true,
      prenom: true,
      photoUrl: true,
      sexe: true,
      grade: true,
      statut: true,
      dateNaissance: true,
      lieuNaissance: true,
      datePriseService: true,
      dateEffetEchelon: true,
      dateFinService: true,
      lieuTransfert: true,
      domaineRecherche: true,
      estResident: true,
      contratCollaboration: true,
      posteResponsabilite: true,
      telephone: true,
      email: true,
      departement: {
        select: {
          id: true,
          nom: true,
          etablissement: { select: { id: true, nom: true, abreviation: true } },
        },
      },
      departementOrigine: {
        select: { id: true, nom: true, region: { select: { id: true, nom: true } } },
      },
      positionActuelle: {
        select: {
          grade: true,
          ordre: true,
          classe: true,
          echelon: true,
          indice: true,
          sousCategorie: true,
        },
      },
      absences: {
        select: {
          id: true,
          type: true,
          statut: true,
          dateDebut: true,
          dateFin: true,
          dateRetour: true,
          motif: true,
        },
        orderBy: { dateDebut: 'desc' },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })
  return enseignants.map(versDossier)
}

/** La grille indiciaire, pour trouver le palier suivant d'un enseignant. */
export async function chargerGrille(): Promise<PalierIndiciaire[]> {
  return prisma.echelonIndiciaire.findMany({
    select: {
      id: true,
      grade: true,
      voie: true,
      sousCategorie: true,
      classe: true,
      echelon: true,
      indice: true,
      ordre: true,
    },
    orderBy: [{ grade: 'asc' }, { ordre: 'asc' }],
  })
}

/** Noms des établissements, départements, régions… pour les listes déroulantes et les puces. */
export async function chargerReferentielsFiltres(): Promise<ReferentielsFiltres> {
  const [etablissements, departements, regions, departementsOrigine] = await Promise.all([
    prisma.etablissement.findMany({
      select: { id: true, nom: true, abreviation: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.departement.findMany({
      select: { id: true, nom: true, etablissementId: true },
      orderBy: { nom: 'asc' },
    }),
    prisma.region.findMany({ select: { id: true, nom: true }, orderBy: { nom: 'asc' } }),
    prisma.departementOrigine.findMany({
      select: { id: true, nom: true, regionId: true },
      orderBy: { nom: 'asc' },
    }),
  ])
  return { etablissements, departements, regions, departementsOrigine }
}
