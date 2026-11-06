import { formaterPositionCompacte } from '@/domain/avancement/formaterPositionCompacte'
import type { EtablissementRapport, LigneRapport } from './rapportAvancementHtml'

type Position = {
  grade: string
  sousCategorie: string | null
  classe: number | null
  echelon: number | null
  indice: number
}

export type SelectionDuRapport = {
  enseignantId: string
  positionProposee: Position
  enseignant: {
    nom: string
    prenom: string
    matricule: string
    diplomePlusEleve: string | null
    dateEffetEchelon: Date
    positionActuelle: Position
    departement: { etablissement: { nom: string; abreviation: string | null } }
  }
}

/** Ce que la validation du rapport a enregistré pour un enseignant (historique d'avancement). */
export type AvancementDuRapport = {
  enseignantId: string
  anciennePosition: Position
  nouvellePosition: Position
  dateAncienEffet: Date
  dateNouvelEffet: Date
  avisCU: boolean
  avisCA: boolean
  observations: string | null
}

/**
 * Lignes du rapport imprimé, groupées par établissement.
 *
 * Tant que le rapport est un brouillon, l'enseignant occupe encore sa position d'avant : le
 * « dernier avancement » est sa fiche, et le « nouvel avancement » la position proposée, datée
 * de la fin de période. Une fois le rapport validé, la fiche porte déjà la nouvelle position
 * (et sa date) : la lire donnerait deux fois la même chose. Le rapport imprimé se lit alors
 * dans l'historique, qui a gardé la position et la date d'avant.
 */
export function construireEtablissementsRapport(rapport: {
  periodeFin: Date
  selections: SelectionDuRapport[]
  avancements: AvancementDuRapport[]
}): EtablissementRapport[] {
  const historique = new Map(rapport.avancements.map((a) => [a.enseignantId, a]))
  const parEtablissement = new Map<string, EtablissementRapport>()

  for (const selection of rapport.selections) {
    const { enseignant } = selection
    const avancement = historique.get(selection.enseignantId)
    const avant = avancement?.anciennePosition ?? enseignant.positionActuelle
    const apres = avancement?.nouvellePosition ?? selection.positionProposee

    const ligne: LigneRapport = {
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      matricule: enseignant.matricule,
      diplome: enseignant.diplomePlusEleve,
      grade: avant.grade,
      dateDernierAvancement: avancement?.dateAncienEffet ?? enseignant.dateEffetEchelon,
      dernierAvancement: formaterPositionCompacte(avant),
      dateNouvelAvancement: avancement?.dateNouvelEffet ?? rapport.periodeFin,
      nouvelAvancement: formaterPositionCompacte(apres),
      observations: avancement?.observations ?? '',
      avisCU: avancement?.avisCU ?? false,
      avisCA: avancement?.avisCA ?? false,
    }

    const { nom, abreviation } = enseignant.departement.etablissement
    const etablissement = parEtablissement.get(nom) ?? { nom, abreviation, lignes: [] }
    etablissement.lignes.push(ligne)
    parEtablissement.set(nom, etablissement)
  }

  return [...parEtablissement.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}
