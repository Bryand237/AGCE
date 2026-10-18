import { erreurPositionProposee, type PositionComparable } from './positionProposee'

/**
 * Une sélection est calculée à la CRÉATION du rapport ; la validation peut avoir lieu des jours
 * plus tard. Entre-temps, l'enseignant a pu être marqué retraité ou transféré, ou sa position a
 * pu changer (fiche corrigée, autre rapport validé pour la même période). Appliquer alors la
 * sélection ferait avancer un enseignant parti, ou enregistrerait un avancement « de X vers X ».
 */
export type SelectionAValider = {
  statutEnseignant: string
  positionActuelle: PositionComparable
  positionProposee: PositionComparable
}

const LIBELLES_STATUT: Record<string, string> = { RETRAITE: 'retraité', TRANSFERE: 'transféré' }

/** Pourquoi la sélection ne peut plus être appliquée, ou `undefined` si elle peut l'être. */
export function motifSelectionPerimee(selection: SelectionAValider): string | undefined {
  if (selection.statutEnseignant !== 'ACTIF') {
    const statut =
      LIBELLES_STATUT[selection.statutEnseignant] ?? selection.statutEnseignant.toLowerCase()
    return `Cet enseignant est ${statut} : il ne peut plus avancer.`
  }
  // Même règle que pour une position choisie à la main (voir positionProposee.ts).
  if (erreurPositionProposee(selection.positionActuelle, selection.positionProposee)) {
    return "Sa position a changé depuis la sélection : la proposition n'est plus valable."
  }
  return undefined
}

/**
 * Sépare les sélections applicables de celles qu'il faut signaler. Chaque sélection périmée
 * garde tous ses champs et reçoit en plus son `motif`.
 */
export function separerSelections<T extends SelectionAValider>(selections: T[]) {
  const valides: T[] = []
  const perimees: (T & { motif: string })[] = []
  for (const selection of selections) {
    const motif = motifSelectionPerimee(selection)
    if (motif) perimees.push({ ...selection, motif })
    else valides.push(selection)
  }
  return { valides, perimees }
}
