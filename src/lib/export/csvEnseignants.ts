import { absenceActuelle, LIBELLES_TYPE_ABSENCE } from '@/domain/absences/etatAbsence'
import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { LIBELLES_STATUT_ENSEIGNANT } from '@/domain/enseignants/dossier'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { construireCsv } from './csv'

const ouiNon = (valeur: boolean) => (valeur ? 'Oui' : 'Non')
const dateOuVide = (date: Date | null) => (date ? formaterDateCourte(date) : '')

/** Colonnes de l'export tableur : toute la fiche, plus les dates calculées. */
const COLONNES: { entete: string; valeur: (ligne: LigneRecherche, jour: Date) => string }[] = [
  { entete: 'Matricule', valeur: ({ dossier }) => dossier.matricule },
  { entete: 'Nom', valeur: ({ dossier }) => dossier.nom },
  { entete: 'Prénom', valeur: ({ dossier }) => dossier.prenom },
  { entete: 'Sexe', valeur: ({ dossier }) => dossier.sexe },
  {
    entete: 'Date de naissance',
    valeur: ({ dossier }) => formaterDateCourte(dossier.dateNaissance),
  },
  { entete: 'Lieu de naissance', valeur: ({ dossier }) => dossier.lieuNaissance },
  { entete: 'Grade', valeur: ({ dossier }) => LIBELLES_GRADE[dossier.grade] ?? dossier.grade },
  { entete: 'Statut', valeur: ({ dossier }) => LIBELLES_STATUT_ENSEIGNANT[dossier.statut] },
  { entete: 'Établissement', valeur: ({ dossier }) => dossier.etablissement.nom },
  { entete: "Département d'affectation", valeur: ({ dossier }) => dossier.departement.nom },
  { entete: 'Domaine de recherche', valeur: ({ dossier }) => dossier.domaineRecherche ?? '' },
  {
    entete: 'Date de prise de service',
    valeur: ({ dossier }) => formaterDateCourte(dossier.datePriseService),
  },
  { entete: 'Date de retraite', valeur: ({ situation }) => dateOuVide(situation.dateRetraite) },
  {
    entete: 'Prochain avancement',
    valeur: ({ situation }) =>
      situation.dateProchainAvancement
        ? formaterDateCourte(situation.dateProchainAvancement)
        : situation.finDeGrade
          ? 'Fin de grade'
          : '',
  },
  { entete: 'Classe', valeur: ({ dossier }) => String(dossier.position.classe ?? '') },
  { entete: 'Échelon', valeur: ({ dossier }) => String(dossier.position.echelon ?? '') },
  { entete: 'Indice', valeur: ({ dossier }) => String(dossier.position.indice) },
  { entete: 'Résident', valeur: ({ dossier }) => ouiNon(dossier.estResident) },
  {
    entete: 'Contrat de collaboration',
    valeur: ({ dossier }) => ouiNon(dossier.contratCollaboration),
  },
  { entete: 'Poste de responsabilité', valeur: ({ dossier }) => dossier.posteResponsabilite ?? '' },
  { entete: "Région d'origine", valeur: ({ dossier }) => dossier.regionOrigine?.nom ?? '' },
  {
    entete: "Département d'origine",
    valeur: ({ dossier }) => dossier.departementOrigine?.nom ?? '',
  },
  { entete: 'Téléphone', valeur: ({ dossier }) => dossier.telephone ?? '' },
  { entete: 'Adresse mail', valeur: ({ dossier }) => dossier.email ?? '' },
  {
    entete: 'Absence actuelle',
    valeur: ({ dossier }, jour) => {
      const actuelle = absenceActuelle(dossier.absences, jour)
      if (!actuelle) return ''
      const type = LIBELLES_TYPE_ABSENCE[actuelle.absence.type]
      const fin = formaterDateCourte(actuelle.absence.dateFin)
      return actuelle.etat === 'en-cours'
        ? `${type} jusqu'au ${fin}`
        : `Retour attendu : ${type} (fin prévue le ${fin})`
    },
  },
]

export const ENTETES_CSV_ENSEIGNANTS = COLONNES.map((colonne) => colonne.entete)

/** La sélection de la recherche, une ligne par enseignant, dans l'ordre de la sélection. */
export function construireCsvSelection(lignes: readonly LigneRecherche[], jour: Date): string {
  return construireCsv(
    ENTETES_CSV_ENSEIGNANTS,
    lignes.map((ligne) => COLONNES.map((colonne) => colonne.valeur(ligne, jour)))
  )
}
