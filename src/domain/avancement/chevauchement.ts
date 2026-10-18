import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'

export type RapportEnChevauchement = {
  numero: string
  periodeDebut: Date
  periodeFin: Date
}

/**
 * Message d'avertissement quand un rapport créé ou modifié couvre une période déjà couverte par
 * d'autres rapports en brouillon. Deux brouillons sur la même période proposent les mêmes
 * enseignants : les valider tous deux les ferait avancer deux fois.
 *
 * C'est un avertissement, pas un refus : la personne peut confirmer (« Créer quand même »,
 * « Enregistrer quand même »), d'où la phrase finale qui dit ce qui n'a pas été fait.
 */
export function avertissementChevauchement(
  autres: RapportEnChevauchement[],
  operation: 'creation' | 'modification'
): string {
  const liste = autres
    .map(
      (a) =>
        `« ${a.numero} » (du ${formaterDateCourte(a.periodeDebut)} au ${formaterDateCourte(a.periodeFin)})`
    )
    .join(', ')
  const plusieurs = autres.length > 1
  const debut = plusieurs
    ? 'D’autres rapports en brouillon couvrent déjà cette période'
    : 'Un autre rapport en brouillon couvre déjà cette période'
  const consequence = plusieurs
    ? 'Les valider tous ferait avancer les mêmes enseignants plusieurs fois.'
    : 'Valider les deux ferait avancer les mêmes enseignants deux fois.'
  const suite =
    operation === 'creation'
      ? 'Rien n’a été créé : changez la période, ou créez ce rapport quand même.'
      : 'Rien n’a été enregistré : changez la période, ou enregistrez quand même.'
  return `${debut} : ${liste}. ${consequence} ${suite}`
}
