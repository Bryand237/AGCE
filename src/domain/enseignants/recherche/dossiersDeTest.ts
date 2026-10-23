import type { PalierIndiciaire } from '../../avancement/calculerProchainEchelon'
import type { DossierEnseignant } from '../dossier'

/** Outils des tests de la recherche et des listes : jamais utilisés par le code de l'application. */

export const jour = (texte: string) => new Date(`${texte}T00:00:00Z`)

let compteur = 0

/** Un dossier plausible (Professeur actif de FALSH), que chaque test adapte à son besoin. */
export function dossierDeTest(surcharge: Partial<DossierEnseignant> = {}): DossierEnseignant {
  compteur += 1
  return {
    id: `id-${String(compteur).padStart(4, '0')}`,
    matricule: `MAT${String(compteur).padStart(4, '0')}`,
    nom: 'MBARGA',
    prenom: 'Alice',
    photoUrl: null,
    sexe: 'F',
    grade: 'PROFESSEUR',
    statut: 'ACTIF',
    dateNaissance: jour('1970-03-15'),
    lieuNaissance: 'Yaoundé',
    datePriseService: jour('2000-09-01'),
    dateEffetEchelon: jour('2024-07-01'),
    dateFinService: null,
    lieuTransfert: null,
    domaineRecherche: 'Géomatique',
    estResident: true,
    contratCollaboration: false,
    posteResponsabilite: null,
    telephone: '699001122',
    email: 'alice.mbarga@example.cm',
    departement: { id: 'dep-geo', nom: 'Département de Géographie' },
    etablissement: {
      id: 'etab-falsh',
      nom: 'Faculté des Arts, Lettres et Sciences Humaines',
      abreviation: 'FALSH',
    },
    departementOrigine: { id: 'orig-bamboutos', nom: 'Bamboutos' },
    regionOrigine: { id: 'reg-ouest', nom: 'Ouest' },
    position: {
      grade: 'PROFESSEUR',
      ordre: 1,
      classe: 2,
      echelon: 1,
      indice: 940,
      sousCategorie: null,
    },
    absences: [],
    ...surcharge,
  }
}

const palier = (
  grade: string,
  ordre: number,
  indice: number,
  voie: string | null = null
): PalierIndiciaire => ({
  id: `${grade}-${voie ?? 'x'}-${ordre}`,
  grade,
  voie,
  sousCategorie: null,
  classe: 2,
  echelon: ordre,
  indice,
  ordre,
})

/** Grille minimale : Professeur à 3 paliers, Assistant avec deux voies. */
export const GRILLE_DE_TEST: PalierIndiciaire[] = [
  palier('PROFESSEUR', 1, 940),
  palier('PROFESSEUR', 2, 1005),
  palier('PROFESSEUR', 3, 1050),
  palier('CHARGE_DE_COURS', 1, 715),
  palier('CHARGE_DE_COURS', 2, 785),
  palier('ASSISTANT', 1, 465, 'SANS_THESE'),
  palier('ASSISTANT', 2, 530, 'SANS_THESE'),
]
