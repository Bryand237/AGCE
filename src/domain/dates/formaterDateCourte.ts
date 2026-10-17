/**
 * Date au format « jj/mm/aaaa », lue en UTC.
 *
 * Les dates de l'application sont enregistrées à minuit UTC (c'est ce qu'envoie un champ
 * <input type="date">) : les lire en UTC donne le même jour partout, quel que soit le fuseau
 * du serveur. toLocaleDateString() sans fuseau afficherait la veille sur une machine réglée
 * à l'ouest de l'UTC.
 */
export function formaterDateCourte(date: Date): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  return `${deuxChiffres(date.getUTCDate())}/${deuxChiffres(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`
}
