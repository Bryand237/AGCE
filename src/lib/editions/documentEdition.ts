import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { messageEditionVide, titreEdition, type DemandeEdition } from '@/domain/editions/editions'
import { regrouperParEtablissement } from '@/domain/editions/parEtablissement'
import { legendeAbreviations } from '@/domain/enseignants/abreviations'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { construireHtmlListe, type SectionListe } from '@/lib/pdf/liste/documentListe'
import { colonnesEdition } from './colonnes'

/**
 * Une liste officielle, imprimée : une page (ou plus) par établissement, sans bandeau de grade
 * (les listes de l'administration ne regroupent pas par grade), avec en sous-titre l'intitulé de la
 * liste et l'effectif, et en bas la légende des sigles utilisés.
 */

const effectif = (nombre: number) => `${nombre} enseignant${nombre > 1 ? 's' : ''}`

export function sectionsEdition(
  demande: DemandeEdition,
  lignes: readonly LigneRecherche[]
): SectionListe<LigneRecherche>[] {
  return regrouperParEtablissement(lignes).map((etablissement) => ({
    titre: etablissement.nom,
    sousTitre: `${titreEdition(demande)} — ${effectif(etablissement.lignes.length)}`,
    legende: legendeAbreviations(
      etablissement.lignes.map(({ dossier }) => dossier.grade),
      etablissement.lignes.flatMap(({ dossier }) =>
        dossier.regionOrigine ? [dossier.regionOrigine.nom] : []
      )
    ),
    groupes: [{ lignes: etablissement.lignes }],
  }))
}

export function construireHtmlEdition(
  demande: DemandeEdition,
  lignes: readonly LigneRecherche[],
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
