import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { LIBELLES_TYPE_ABSENCE } from '@/domain/absences/etatAbsence'
import {
  messageEditionVide,
  nombreEnseignants,
  titreEdition,
  type DemandeEdition,
  type LigneEdition,
} from '@/domain/editions/editions'
import { regrouperParEtablissement } from '@/domain/editions/parEtablissement'
import { legendeAbreviations } from '@/domain/enseignants/abreviations'
import {
  construireHtmlListe,
  type GroupeListe,
  type SectionListe,
} from '@/lib/pdf/liste/documentListe'
import { colonnesEdition } from './colonnes'

/**
 * Une liste officielle, imprimée : une page (ou plus) par établissement, sans bandeau de grade
 * (les listes de l'administration ne regroupent pas par grade), avec en sous-titre l'intitulé de la
 * liste et l'effectif, et en bas la légende des sigles utilisés. Seule la liste des congés sépare
 * ses lignes en deux bandeaux (maternité, maladie) : le client ne demande pas de colonne « type »
 * et, sans elle, on ne saurait pas lequel est lequel.
 */

const effectif = (nombre: number) => `${nombre} enseignant${nombre > 1 ? 's' : ''}`

const TYPES_CONGE = ['CONGE_MATERNITE', 'CONGE_MALADIE'] as const

function groupesDeLigne(
  demande: DemandeEdition,
  lignes: LigneEdition[]
): GroupeListe<LigneEdition>[] {
  if (demande.cle !== 'conges') return [{ lignes }]
  return TYPES_CONGE.map((type) => ({
    titre: LIBELLES_TYPE_ABSENCE[type],
    lignes: lignes.filter(({ absence }) => absence?.type === type),
  }))
}

export function sectionsEdition(
  demande: DemandeEdition,
  lignes: readonly LigneEdition[]
): SectionListe<LigneEdition>[] {
  return regrouperParEtablissement(lignes).map((etablissement) => ({
    titre: etablissement.nom,
    sousTitre: `${titreEdition(demande)} — ${effectif(nombreEnseignants(etablissement.lignes))}`,
    legende: legendeAbreviations(
      etablissement.lignes.map(({ dossier }) => dossier.grade),
      etablissement.lignes.flatMap(({ dossier }) =>
        dossier.regionOrigine ? [dossier.regionOrigine.nom] : []
      )
    ),
    groupes: groupesDeLigne(demande, etablissement.lignes),
  }))
}

export function construireHtmlEdition(
  demande: DemandeEdition,
  lignes: readonly LigneEdition[],
  jour: Date
): string {
  return construireHtmlListe({
    enteteGauche: `Université de Ngaoundéré — liste éditée le ${formaterDateCourte(jour)}`,
    enteteDroite: 'UN/R/VR-EPDTIC/SG/DAAC/DEPE/SSPE',
    colonnes: colonnesEdition(demande),
    sections: sectionsEdition(demande, lignes),
    messageSiVide: messageEditionVide(demande),
  })
}
