/**
 * Les détails d'une mission : l'établissement d'accueil et l'objet.
 *
 * La base n'a pas de colonne pour le lieu d'accueil (et le schéma ne change pas) : les deux
 * informations sont enregistrées ensemble dans le champ `motif` de l'absence, chacune sur sa ligne
 * et précédée de son intitulé, ce qui rend le texte lisible tel quel (liste des missions, export) :
 *
 *   Lieu d'accueil : Université de Douala
 *   Objet : Participation au jury de soutenance de thèses
 *
 * Un `motif` écrit avant cette convention (texte libre, sans intitulé) est lu comme l'OBJET de la
 * mission : c'est ce que « motif » voulait dire, et il reste lisible tel qu'il est.
 */

export type DetailsMission = { lieuAccueil: string; objet: string }

const INTITULE_LIEU = "Lieu d'accueil"
const INTITULE_OBJET = 'Objet'

/** Le lieu tient sur une ligne (c'est un champ d'une ligne) : les blancs sont ramenés à un. */
const uneLigne = (texte: string | null | undefined) => (texte ?? '').replace(/\s+/g, ' ').trim()

/** L'objet garde ses retours à la ligne éventuels. */
const objetNettoye = (texte: string | null | undefined) =>
  (texte ?? '').replace(/\r\n?/g, '\n').trim()

/** Le texte à enregistrer dans `motif`, ou `null` quand rien n'est renseigné. */
export function composerMotifMission(details: Partial<DetailsMission>): string | null {
  const lieu = uneLigne(details.lieuAccueil)
  const objet = objetNettoye(details.objet)
  const lignes = [
    ...(lieu ? [`${INTITULE_LIEU} : ${lieu}`] : []),
    ...(objet ? [`${INTITULE_OBJET} : ${objet}`] : []),
  ]
  return lignes.length ? lignes.join('\n') : null
}

/** Relit le lieu d'accueil et l'objet dans le `motif` enregistré. Ne lève jamais d'exception. */
export function lireMotifMission(motif: string | null | undefined): DetailsMission {
  const lignes = objetNettoye(motif).split('\n')
  let lieuAccueil = ''
  let reste = lignes
  const ligneLieu = /^Lieu d['’]accueil\s*:\s*(.*)$/i.exec(lignes[0] ?? '')
  if (ligneLieu) {
    lieuAccueil = uneLigne(ligneLieu[1])
    reste = lignes.slice(1)
  }
  const texteObjet = reste.join('\n').trim()
  const ligneObjet = /^Objet\s*:\s*([\s\S]*)$/i.exec(texteObjet)
  return { lieuAccueil, objet: (ligneObjet?.[1] ?? texteObjet).trim() }
}

/**
 * Ce qu'il faut enregistrer dans `motif` d'après les champs d'un formulaire. Un formulaire de
 * mission envoie `lieuAccueil` et `objetMission` (les deux champs, même vides) : le motif est
 * recomposé. Tout autre formulaire n'envoie que `motif`, qui reste tel quel.
 */
export function motifAEnregistrer(saisie: {
  motif?: string | null
  lieuAccueil?: string
  objetMission?: string
}): string | null | undefined {
  if (saisie.lieuAccueil === undefined && saisie.objetMission === undefined) return saisie.motif
  return composerMotifMission({ lieuAccueil: saisie.lieuAccueil, objet: saisie.objetMission })
}

/** Le motif d'une mission sur une seule ligne, pour une liste : « Université de Douala — Jury… ». */
export function motifMissionSurUneLigne(motif: string | null | undefined): string {
  const { lieuAccueil, objet } = lireMotifMission(motif)
  return [lieuAccueil, uneLigne(objet)].filter(Boolean).join(' — ')
}

/**
 * Ce qui manque avant de générer l'attestation d'une mission, ou `undefined` quand les deux
 * informations sont renseignées : le document les imprime, et un blanc dans une décision signée
 * est une erreur qu'on ne retrouve qu'après coup.
 */
export function erreurDetailsMission(motif: string | null | undefined): string | undefined {
  const { lieuAccueil, objet } = lireMotifMission(motif)
  const debut = "Avant de générer l'attestation, renseignez"
  const fin = '(bouton « Modifier »).'
  if (!lieuAccueil && !objet) {
    return `${debut} l'établissement d'accueil et l'objet de la mission ${fin}`
  }
  if (!lieuAccueil) return `${debut} l'établissement d'accueil de la mission ${fin}`
  if (!objet) return `${debut} l'objet de la mission ${fin}`
  return undefined
}
