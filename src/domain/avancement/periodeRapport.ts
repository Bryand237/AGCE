import { formaterDateIso } from '../dates/jourCivil'
import { blocageRapportValide, type BlocageRapportValide } from './rapportValideModifiable'

/**
 * Deux dates du même jour. Les dates du projet sont enregistrées à minuit UTC (voir
 * `formaterDateCourte`) : on compare donc le jour UTC, sans se laisser tromper par une heure.
 */
export function memeJour(a: Date, b: Date): boolean {
  return formaterDateIso(a) === formaterDateIso(b)
}

export type AvancementDuRapport = {
  nom: string
  prenom: string
  statutDecision: string | null
  positionActuelleId: string
  nouvellePositionId: string
}

const RAISONS: Record<BlocageRapportValide, string> = {
  'decision-generee': 'une décision a déjà été générée',
  'position-changee': 'a changé de position depuis la validation',
}

/** Au-delà, la liste des enseignants en cause est abrégée (« et 3 autres »). */
const NOMBRE_CITES = 5

/**
 * La fin de période d'un rapport validé est recopiée à la validation : c'est la date d'effet de
 * chaque avancement (historique) et de l'échelon de l'enseignant (fiche). La corriger oblige à
 * reporter la nouvelle date aux deux endroits, ce qui n'est sûr que dans les deux cas que
 * `blocageRapportValide` contrôle pour chaque avancement : aucune décision générée, et
 * l'enseignant sur la position issue du rapport. Sinon, la date d'un document déjà produit ou
 * celle d'un avancement ultérieur ne correspondrait plus.
 *
 * Renvoie le message à afficher, ou `undefined` si la date peut être reportée partout.
 */
export function erreurChangementFinDePeriode(
  avancements: AvancementDuRapport[]
): string | undefined {
  const bloques = avancements.flatMap((a) => {
    const blocage = blocageRapportValide(a)
    return blocage ? [{ nom: `${a.nom} ${a.prenom}`, blocage }] : []
  })
  if (bloques.length === 0) return undefined

  const cites = bloques
    .slice(0, NOMBRE_CITES)
    .map((b) => `${b.nom} (${RAISONS[b.blocage]})`)
    .join(' ; ')
  const autres = bloques.length - NOMBRE_CITES
  const reste = autres > 0 ? ` et ${autres} autre${autres > 1 ? 's' : ''}` : ''

  return (
    'La fin de période d’un rapport validé ne peut plus changer : sa date a été reportée sur ' +
    'l’historique et sur les fiches, et elle ne se corrige que si aucune décision n’a été générée ' +
    'et si chaque enseignant occupe encore la position issue du rapport. ' +
    `En cause : ${cites}${reste}. Rien n’a été modifié.`
  )
}
