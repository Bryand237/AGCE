/**
 * Calculs sur des jours civils.
 *
 * Toutes les dates de l'application sont enregistrées à minuit UTC (c'est ce qu'envoie un champ
 * <input type="date">) et affichées en UTC (voir formaterDateCourte). Les calculs doivent suivre
 * la même règle : manipuler une date avec les accesseurs « locaux » (setFullYear, getDate…) la
 * décale d'un jour dès que le fuseau du serveur a changé d'heure légale entre les deux dates,
 * ce qui fausse un anniversaire sans qu'aucun message ne le signale.
 */

/**
 * Le jour d'aujourd'hui, tel que l'utilisateur le lit sur son calendrier, ramené à minuit UTC
 * pour être comparable aux dates enregistrées. Le jour est celui du fuseau de la machine (celle
 * du service, au Cameroun) et non celui de l'UTC, qui retarde d'un jour entre minuit et 1 h.
 */
export function aujourdhui(maintenant: Date = new Date()): Date {
  return new Date(Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()))
}

/** Minuit UTC du jour (UTC) de la date donnée. */
export function debutDeJour(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/**
 * Date + un nombre d'années, en UTC, heure comprise.
 * Un 29 février tombant sur une année non bissextile devient le 1er mars (comportement de
 * JavaScript, identique à celui de l'ancien calcul).
 */
export function ajouterAnnees(date: Date, annees: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + annees,
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  )
}

/** Année (UTC) d'une date. */
export function anneeDe(date: Date): number {
  return date.getUTCFullYear()
}

/** Premier jour (1er janvier) de l'année, à minuit UTC. */
export function premierJourDAnnee(annee: number): Date {
  return new Date(Date.UTC(annee, 0, 1))
}

/** Dernier jour (31 décembre) de l'année, à minuit UTC. */
export function dernierJourDAnnee(annee: number): Date {
  return new Date(Date.UTC(annee, 11, 31))
}

/**
 * Lit une date « AAAA-MM-JJ » (format d'un champ date et des adresses de l'application).
 * Renvoie undefined si le texte n'a pas ce format ou désigne un jour qui n'existe pas
 * (30 février, mois 13…) : une saisie invalide est ignorée, jamais corrigée en silence.
 */
export function analyserDateIso(texte: string): Date | undefined {
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte.trim())
  if (!correspondance) return undefined
  const [, a, m, j] = correspondance
  const annee = Number(a)
  const mois = Number(m)
  const jour = Number(j)
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  // Date.UTC() reporte silencieusement un 30 février sur mars : on vérifie l'aller-retour.
  // L'année 0 à 99 est lue par Date.UTC comme 1900 à 1999 : on la rejette de la même façon.
  if (
    date.getUTCFullYear() !== annee ||
    date.getUTCMonth() !== mois - 1 ||
    date.getUTCDate() !== jour
  ) {
    return undefined
  }
  return date
}

/** « AAAA-MM-JJ » (UTC), la valeur d'un champ date et d'un paramètre d'adresse. */
export function formaterDateIso(date: Date): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  const annee = String(date.getUTCFullYear()).padStart(4, '0')
  return `${annee}-${deuxChiffres(date.getUTCMonth() + 1)}-${deuxChiffres(date.getUTCDate())}`
}
