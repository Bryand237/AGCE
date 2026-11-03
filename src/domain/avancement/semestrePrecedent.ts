/**
 * La période que propose un nouveau rapport d'avancement : le dernier semestre écoulé, en dates de
 * champ date (« AAAA-MM-JJ »). De janvier à juin, c'est juillet-décembre de l'année précédente ; de
 * juillet à décembre, c'est janvier-juin de l'année en cours.
 *
 * `jour` est le jour d'aujourd'hui à minuit UTC (`aujourdhui()`), lu en UTC : la période ne dépend
 * pas du fuseau de la machine, seulement du jour du calendrier de l'utilisateur.
 */
export function semestrePrecedent(jour: Date): { debut: string; fin: string } {
  const annee = jour.getUTCFullYear()
  if (jour.getUTCMonth() >= 6) return { debut: `${annee}-01-01`, fin: `${annee}-06-30` }
  return { debut: `${annee - 1}-07-01`, fin: `${annee - 1}-12-31` }
}
