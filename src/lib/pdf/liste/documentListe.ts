import { echapperHtml } from './echapperHtml'

/**
 * Cadre commun de toutes les listes imprimées (fichier des enseignants, listes demandées par
 * l'administration…). Une liste décrit ses COLONNES et ses SECTIONS (une par établissement) ;
 * ce fichier s'occupe de tout ce qui fait qu'un tableau tient bien sur la feuille :
 *
 * - une seule marge (celle du PDF, fixée dans genererPdf.ts) : la page garde toute sa largeur ;
 * - des largeurs de colonnes en millimètres, ramenées à 100 % de la largeur utile, donc le
 *   tableau remplit exactement la feuille et ses colonnes tombent au même endroit sur chaque page ;
 * - des cellules qui passent à la ligne au lieu de déborder sur les traits de la grille ;
 * - toutes les valeurs échappées (voir echapperHtml.ts).
 *
 * Fonction pure : elle ne touche ni la base ni Chromium, donc elle se teste telle quelle. La
 * conversion en PDF est faite par genererPdf().
 */

/** Largeur imprimable d'une feuille A4 en paysage : 297 mm moins 2 × 10 mm de marge. */
export const LARGEUR_UTILE_MM = 277

/** La colonne « N° » est ajoutée par le cadre, toujours en première position. */
export const LARGEUR_NUMERO_MM = 7

export type ColonneListe<T> = {
  entete: string
  /** Largeur souhaitée en millimètres. Le total est ramené à la largeur de la feuille. */
  largeur: number
  /** Texte brut de la cellule : le cadre se charge de l'échapper. */
  valeur: (ligne: T) => string
  /** Interdit le retour à la ligne (dates, matricule) : la valeur reste d'un bloc. */
  insecable?: boolean
  /**
   * Autorise un retour à la ligne après « @ », « . » et « _ » : pour les adresses e-mail, qui
   * n'ont pas d'espace où se couper. Le texte copié depuis le PDF reste intact.
   */
  coupureDouce?: boolean
}

export type GroupeListe<T> = {
  /** Bandeau vert au-dessus du groupe (par exemple « Professeurs »). Absent : pas de bandeau. */
  titre?: string
  lignes: T[]
}

export type SectionListe<T> = {
  /** Titre en gros caractères, en haut de la page (par exemple le nom de l'établissement). */
  titre: string
  /** Précision sous le titre (par exemple « Admis à la retraite en 2027 »). */
  sousTitre?: string
  /**
   * Note imprimée sous le tableau (par exemple l'explication des sigles « PR », « OU »…). Absente
   * ou vide : rien n'est imprimé.
   */
  legende?: string
  groupes: GroupeListe<T>[]
}

export type DocumentListe<T> = {
  enteteGauche: string
  enteteDroite: string
  colonnes: ColonneListe<T>[]
  sections: SectionListe<T>[]
  /** Affiché quand il n'y a aucune ligne à imprimer (filtre trop strict, liste vide). */
  messageSiVide: string
}

/**
 * Largeur de chaque colonne en pourcentage du tableau, « N° » en tête. Le total fait exactement
 * 100 : l'écart d'arrondi est reporté sur la dernière colonne.
 */
export function largeursEnPourcent(largeursMm: number[]): number[] {
  const total = largeursMm.reduce((somme, largeur) => somme + largeur, 0)
  if (total <= 0) return largeursMm.map(() => 0)
  const arrondies = largeursMm.map((largeur) => Math.round((largeur / total) * 100000) / 1000)
  const dejaReparti = arrondies.slice(0, -1).reduce((somme, valeur) => somme + valeur, 0)
  arrondies[arrondies.length - 1] = Math.round((100 - dejaReparti) * 1000) / 1000
  return arrondies
}

const STYLE = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, 'Liberation Serif', serif;
    font-size: 7.5pt;
    color: #000;
    margin: 0;
  }
  .entete-papier {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
    font-size: 8pt;
  }
  .entete-papier .gauche, .entete-papier .droite { width: 48%; }
  .entete-papier .droite { text-align: right; }
  .titre-section {
    font-family: 'Lucida Calligraphy', 'Brush Script MT', 'Segoe Script', cursive;
    font-size: 26pt;
    text-align: center;
    margin: 0 0 8px;
  }
  .sous-titre-section { text-align: center; font-size: 10pt; margin: -2px 0 8px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.2pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td {
    border: 0.5pt solid #000;
    padding: 2.5px 3px;
    vertical-align: middle;
    text-align: left;
    /* Un mot plus long que sa colonne (adresse e-mail…) est coupé plutôt que de déborder. */
    overflow-wrap: anywhere;
  }
  th {
    background: #f2f2f2;
    font-size: 6.8pt;
    font-weight: bold;
    text-align: center;
    /* Les en-têtes ne se coupent jamais au milieu d'un mot : la largeur des colonnes est
       choisie pour que chaque mot y tienne. */
    overflow-wrap: normal;
  }
  td.insecable { white-space: nowrap; }
  .ligne-groupe td {
    background: #c8dfb6;
    font-weight: bold;
    text-align: center;
    padding: 4px;
    font-size: 7.7pt;
  }
  .section-liste + .section-liste { page-break-before: always; }
  .legende { font-size: 7pt; margin: 6px 0 0; page-break-inside: avoid; }
  .message-vide { text-align: center; font-size: 11pt; margin-top: 40px; }
`

/** Texte de cellule prêt pour le HTML : échappé, avec les coupures douces si la colonne les veut. */
function contenuCellule<T>(colonne: ColonneListe<T>, ligne: T): string {
  const texte = echapperHtml(colonne.valeur(ligne))
  return colonne.coupureDouce ? texte.replace(/([@._])/g, '$1<wbr>') : texte
}

function enTetePapier(gauche: string, droite: string): string {
  return `<div class="entete-papier">
        <div class="gauche">${echapperHtml(gauche)}</div>
        <div class="droite">${echapperHtml(droite)}</div>
      </div>`
}

function tableauSection<T>(section: SectionListe<T>, colonnes: ColonneListe<T>[]): string {
  const pourcents = largeursEnPourcent([LARGEUR_NUMERO_MM, ...colonnes.map((c) => c.largeur)])
  const repartition = pourcents.map((p) => `<col style="width:${p}%">`).join('')
  const entetes = ['N°', ...colonnes.map((c) => c.entete)]
    .map((texte) => `<th>${echapperHtml(texte)}</th>`)
    .join('')

  // Numérotation CONTINUE sur toute la section, à travers les groupes : la liste de
  // référence va de 1 à N en franchissant Professeurs → Maîtres de Conférences → Chargés
  // de Cours, sans repartir à 1 à chaque groupe.
  let numero = 0
  const corps = section.groupes
    .filter((groupe) => groupe.lignes.length > 0)
    .map((groupe) => {
      const bandeau =
        groupe.titre === undefined
          ? ''
          : `<tr class="ligne-groupe"><td colspan="${colonnes.length + 1}">${echapperHtml(groupe.titre)}</td></tr>`
      const lignes = groupe.lignes
        .map((ligne) => {
          numero += 1
          const cellules = colonnes
            .map((colonne) => {
              const classe = colonne.insecable ? ' class="insecable"' : ''
              return `<td${classe}>${contenuCellule(colonne, ligne)}</td>`
            })
            .join('')
          return `<tr><td>${numero}</td>${cellules}</tr>`
        })
        .join('')
      return bandeau + lignes
    })
    .join('')

  return `<table>
        <colgroup>${repartition}</colgroup>
        <thead><tr>${entetes}</tr></thead>
        <tbody>${corps}</tbody>
      </table>`
}

/**
 * HTML complet d'une liste : un bloc par section (saut de page entre deux), chacun avec son
 * en-tête de papier, son titre et son tableau. Les sections sans aucune ligne sont omises ; s'il
 * n'en reste aucune, une page unique annonce que la liste est vide.
 *
 * Si une section dépasse une page, le navigateur répète l'en-tête de colonnes sur les pages
 * suivantes (thead) : rien à faire de notre côté.
 */
export function construireHtmlListe<T>(document: DocumentListe<T>): string {
  const sections = document.sections.filter((s) => s.groupes.some((g) => g.lignes.length > 0))

  const blocs =
    sections.length === 0
      ? `<section class="section-liste">
      ${enTetePapier(document.enteteGauche, document.enteteDroite)}
      <p class="message-vide">${echapperHtml(document.messageSiVide)}</p>
    </section>`
      : sections
          .map((section) => {
            const sousTitre =
              section.sousTitre === undefined
                ? ''
                : `<p class="sous-titre-section">${echapperHtml(section.sousTitre)}</p>`
            const legende = section.legende
              ? `<p class="legende">${echapperHtml(section.legende)}</p>`
              : ''
            return `<section class="section-liste">
      ${enTetePapier(document.enteteGauche, document.enteteDroite)}
      <p class="titre-section">${echapperHtml(section.titre)}</p>
      ${sousTitre}
      ${tableauSection(section, document.colonnes)}
      ${legende}
    </section>`
          })
          .join('\n')

  return `<style>${STYLE}</style>\n${blocs}`
}
