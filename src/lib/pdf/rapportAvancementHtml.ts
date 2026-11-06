import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { formaterMoisAnnee } from '@/domain/dates/formaterMoisAnnee'
import { formaterMatricule } from '@/domain/enseignants/formaterMatricule'
import { LIBELLES_GRADE_PLURIEL, ORDRE_GRADE } from '@/domain/enseignants/grade'
import { echapperHtml } from './echapperHtml'

/**
 * HTML du rapport d'avancement imprimé (PDF), présenté comme le rapport papier du conseil :
 * une page de garde bilingue, puis un tableau par établissement (une page au moins chacun),
 * avec les grades en sous-titres et une numérotation continue dans l'établissement.
 *
 * Fonction pure : elle ne lit ni la base ni le disque. La route lui fournit les lignes déjà
 * établies (positions et dates d'avancement), ce qui permet de la tester sans Chromium.
 */

export type LigneRapport = {
  nom: string
  prenom: string
  matricule: string
  diplome: string | null
  /** Grade de l'enseignant avant l'avancement : il range la ligne sous son sous-titre. */
  grade: string
  dateDernierAvancement: Date
  /** Position d'avant, en notation compacte C/E/Ind. (« 2C/2E/785 »). */
  dernierAvancement: string
  dateNouvelAvancement: Date
  /** Position d'après, en notation compacte C/E/Ind. */
  nouvelAvancement: string
  observations: string
  avisCU: boolean
  avisCA: boolean
}

export type EtablissementRapport = {
  nom: string
  abreviation: string | null
  lignes: LigneRapport[]
}

export type DonneesRapport = {
  numero: string
  periodeDebut: Date
  periodeFin: Date
  /** URI de données du logo, ou null : la page de garde est alors produite sans logo. */
  logo: string | null
  etablissements: EtablissementRapport[]
}

const MAJUSCULES = 'fr-FR'

/**
 * Référence portée en haut de chaque page et numérotation « page/total » en bas à droite : ce
 * sont les modèles d'en-tête et de pied de page de Chromium, qui vivent hors du corps du document.
 */
const STYLE_MARGE =
  "width:100%; box-sizing:border-box; padding:0 10mm; font-family:'Times New Roman','Liberation Serif',serif; text-align:right;"

/** Marges de la page A4 paysage : celle du haut loge la référence, celle du bas la pagination. */
export const MARGES_RAPPORT = { haut: '16mm', bas: '14mm', gauche: '10mm', droite: '10mm' }
export const EN_TETE_RAPPORT = `<div style="${STYLE_MARGE} font-size:13px; font-style:italic;">UN/R/SG/DAAC/DEPE/SSPE</div>`
export const PIED_DE_PAGE_RAPPORT = `<div style="${STYLE_MARGE} font-size:13px; font-weight:bold;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>`

/**
 * Nom du fichier téléchargé, sans accent ni caractère spécial : il est placé dans un en-tête
 * HTTP, où un guillemet ou un caractère hors latin-1 casserait la réponse (« 55ème » →
 * « rapport-55eme.pdf »).
 */
export function nomFichierRapport(numero: string): string {
  const sur = numero
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `rapport-${sur || 'avancement'}.pdf`
}

/** « 54 », « 54ème » ou « 54 ème » → « 54ème ». */
export function numeroEdition(numero: string): string {
  return `${numero.trim().replace(/\s*ème$/i, '')}ème`
}

/** « De JUILLET 2025 à DÉCEMBRE 2025 », les mois lus en UTC. */
export function libellePeriode(debut: Date, fin: Date): string {
  const mois = (d: Date) => formaterMoisAnnee(d).toLocaleUpperCase(MAJUSCULES)
  return `De ${mois(debut)} à ${mois(fin)}`
}

/** « FACULTÉ DES ARTS… (FALSH) » : le nom en capitales, suivi de l'abréviation si elle y manque. */
export function titreEtablissement(nom: string, abreviation: string | null): string {
  const titre = nom.trim().toLocaleUpperCase(MAJUSCULES)
  const abr = abreviation?.trim()
  return abr && !titre.includes('(') ? `${titre} (${abr})` : titre
}

function comparerParNom(a: LigneRapport, b: LigneRapport): number {
  return a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr')
}

const NOMBRE_COLONNES = 11

function enteteTableau(titre: string): string {
  return `
    <thead>
      <tr><th class="titre-etablissement" colspan="${NOMBRE_COLONNES}">${echapperHtml(titre)}</th></tr>
      <tr class="entetes">
        <th rowspan="2">N°</th>
        <th rowspan="2">NOMS &amp; PRÉNOMS</th>
        <th rowspan="2">MATRICULE</th>
        <th rowspan="2">DIPLÔME LE PLUS ÉLEVÉ</th>
        <th colspan="2">DERNIER AVANCEMENT</th>
        <th colspan="2">NOUVEL AVANCEMENT</th>
        <th rowspan="2">OBSERVATIONS</th>
        <th colspan="2">AVIS</th>
      </tr>
      <tr class="entetes sous-entetes">
        <th>DATE</th><th>C/E/Ind.</th><th>DATE</th><th>C/E/Ind.</th><th>CU</th><th>CA</th>
      </tr>
    </thead>`
}

function ligneEnseignant(numero: number, l: LigneRapport): string {
  return `
      <tr class="enseignant">
        <td>${numero}</td>
        <td>${echapperHtml(`${l.nom} ${l.prenom}`.toLocaleUpperCase(MAJUSCULES))}</td>
        <td class="sans-coupure">${echapperHtml(formaterMatricule(l.matricule))}</td>
        <td>${echapperHtml(l.diplome ?? '')}</td>
        <td class="sans-coupure">${formaterDateCourte(l.dateDernierAvancement)}</td>
        <td class="sans-coupure">${echapperHtml(l.dernierAvancement)}</td>
        <td class="sans-coupure">${formaterDateCourte(l.dateNouvelAvancement)}</td>
        <td class="sans-coupure">${echapperHtml(l.nouvelAvancement)}</td>
        <td>${echapperHtml(l.observations)}</td>
        <td>${l.avisCU ? '✓' : ''}</td>
        <td>${l.avisCA ? '✓' : ''}</td>
      </tr>`
}

function sectionEtablissement(etab: EtablissementRapport, index: number): string {
  const parGrade = new Map<string, LigneRapport[]>()
  for (const ligne of [...etab.lignes].sort(comparerParNom)) {
    const liste = parGrade.get(ligne.grade) ?? []
    liste.push(ligne)
    parGrade.set(ligne.grade, liste)
  }

  // Un grade inconnu du référentiel ne doit pas faire disparaître ses enseignants du rapport.
  const grades = [
    ...ORDRE_GRADE.filter((g) => parGrade.has(g)),
    ...[...parGrade.keys()].filter((g) => !(ORDRE_GRADE as readonly string[]).includes(g)),
  ]

  let numero = 0
  const corps = grades
    .map((grade) => {
      const titre = (LIBELLES_GRADE_PLURIEL[grade] ?? grade).toLocaleUpperCase(MAJUSCULES)
      const lignes = (parGrade.get(grade) ?? []).map((l) => ligneEnseignant(++numero, l)).join('')
      return `
      <tr class="ligne-grade"><td colspan="${NOMBRE_COLONNES}">${echapperHtml(titre)}</td></tr>${lignes}`
    })
    .join('')

  return `
    <section class="etablissement${index > 0 ? ' nouvelle-page' : ''}">
      <table>
        <colgroup>
          <col style="width:4%"><col style="width:25%"><col style="width:9%"><col style="width:10%">
          <col style="width:8%"><col style="width:8.5%"><col style="width:8%"><col style="width:8.5%">
          <col style="width:11%"><col style="width:4%"><col style="width:4%">
        </colgroup>
        ${enteteTableau(titreEtablissement(etab.nom, etab.abreviation))}
        <tbody>${corps}
        </tbody>
      </table>
    </section>`
}

const STYLES = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Cambria, 'Times New Roman', 'Liberation Serif', serif;
    font-size: 10pt;
    color: #000;
  }

  /* Page de garde : la page utile mesure 180 mm de haut en paysage (210 mm moins MARGES_RAPPORT). */
  .page-garde { height: 176mm; page-break-after: always; }
  .entete-bilingue {
    display: grid;
    grid-template-columns: 1fr 40mm 1fr;
    column-gap: 4mm;
    align-items: start;
    padding: 6mm 22mm 0;
  }
  .bloc-entete { text-align: center; font-size: 10pt; line-height: 1.35; }
  .bloc-entete p { margin: 0; }
  .bloc-entete .italique { font-style: italic; }
  .logo { display: flex; justify-content: center; padding-top: 10mm; }
  .logo img { width: 30mm; height: auto; display: block; }
  .titres { margin-top: 36mm; text-align: center; }
  .titres p { margin: 0; font-weight: bold; }
  .titre-conseil { font-size: 24pt; }
  .titre-avancement { font-size: 22pt; margin-top: 5mm !important; }
  .titre-periode { font-size: 22pt; margin-top: 3mm !important; }

  /* Tableaux : un par établissement. */
  .nouvelle-page { page-break-before: always; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td {
    border: 0.6pt solid #000;
    padding: 1.6mm 1.2mm;
    text-align: center;
    vertical-align: middle;
    font-size: 9.5pt;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  tr { page-break-inside: avoid; }
  /* Comme sur le rapport papier : les en-têtes de colonnes ne sont pas répétés à chaque page. */
  thead { display: table-row-group; }
  th.titre-etablissement {
    text-align: left;
    font-size: 14pt;
    font-style: italic;
    font-weight: bold;
    padding: 2mm;
  }
  tr.entetes th { font-weight: normal; font-size: 8.5pt; color: #222; }
  tr.ligne-grade td {
    text-align: left;
    font-size: 11pt;
    font-style: italic;
    font-weight: bold;
    padding: 1.2mm 2mm;
    page-break-after: avoid;
  }
  tr.enseignant td { height: 7.4mm; }
  td.sans-coupure { white-space: nowrap; overflow-wrap: normal; }
`

export function construireHtmlRapport(d: DonneesRapport): string {
  const logo = d.logo ? `<img src="${d.logo}" alt="Logo Université de Ngaoundéré" />` : ''

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <style>${STYLES}</style>
</head>
<body>
  <section class="page-garde">
    <div class="entete-bilingue">
      <div class="bloc-entete">
        <p>REPUBLIQUE DU CAMEROUN</p>
        <p class="italique">Paix-Travail-Patrie</p>
        <p>***</p>
        <p>MINISTERE DE L'ENSEIGNEMENT SUPERIEUR</p>
        <p>***</p>
        <p>UNIVERSITE DE NGAOUNDERE</p>
        <p>BP : 454 &nbsp;Fax : 237/22 25 40 01</p>
        <p>E-mail : ngaoundere_university@yahoo.fr</p>
        <p>***</p>
        <p>RECTORAT</p>
        <p>***</p>
        <p>SECRETARIAT GENERAL</p>
        <p>***</p>
        <p>DIRECTION DES AFFAIRES ACADEMIQUES<br>ET DE LA COOPERATION</p>
      </div>
      <div class="logo">${logo}</div>
      <div class="bloc-entete">
        <p>REPUBLIC OF CAMEROON</p>
        <p class="italique">Peace-Work-Fatherland</p>
        <p>***</p>
        <p>MINISTRY OF HIGHER EDUCATION</p>
        <p>***</p>
        <p>THE UNIVERSITY OF NGAOUNDERE</p>
        <p>P.O Box : 454 &nbsp;Fax : 237/22 25 40 01</p>
        <p>E-mail : ngaoundere_university@yahoo.fr</p>
        <p>***</p>
        <p class="italique">RECTOR'S OFFICE</p>
        <p>***</p>
        <p>REGISTRAR'S OFFICE</p>
        <p>***</p>
        <p>OFFICE OF ACADEMIC AFFAIRS<br>AND CO-OPERATION</p>
      </div>
    </div>
    <div class="titres">
      <p class="titre-conseil">${echapperHtml(numeroEdition(d.numero))} CONSEIL DE L'UNIVERSITÉ DE NGAOUNDÉRÉ</p>
      <p class="titre-avancement">AVANCEMENT INDICIAIRE NORMAL DES ENSEIGNANTS</p>
      <p class="titre-periode">${echapperHtml(libellePeriode(d.periodeDebut, d.periodeFin))}</p>
    </div>
  </section>
  ${d.etablissements.map(sectionEtablissement).join('')}
</body>
</html>`
}
