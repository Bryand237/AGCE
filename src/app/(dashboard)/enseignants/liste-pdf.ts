import { prisma } from '@/lib/prisma'
import { genererPdf } from '@/lib/pdf/genererPdf'
import { calculerDateRetraitePrevue } from '@/domain/enseignants/retraite'
import { LIBELLES_GRADE_PLURIEL as LIBELLES_GRADE, ORDRE_GRADE } from '@/domain/enseignants/grade'

async function recupererDonnees() {
  return prisma.etablissement.findMany({
    include: {
      departements: {
        orderBy: { nom: 'asc' },
        include: {
          enseignants: {
            where: { statut: 'ACTIF' },
            include: {
              departementOrigine: { include: { region: true } },
            },
            orderBy: { nom: 'asc' },
          },
        },
      },
    },
    orderBy: { nom: 'asc' },
  })
}

function ligneTableau(
  e: {
    matricule: string
    nom: string
    prenom: string
    dateNaissance: Date
    lieuNaissance: string
    sexe: string
    domaineRecherche: string | null
    datePriseService: Date
    estResident: boolean
    contratCollaboration: boolean
    posteResponsabilite: string | null
    telephone: string | null
    email: string | null
    departementOrigine: { nom: string; region: { nom: string } } | null
  },
  grade: string,
  index: number,
  nomDepartement: string
) {
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR')
  const anneeRetraitePrevue = calculerDateRetraitePrevue(e.dateNaissance, grade).getFullYear()
  return `<tr>
    <td>${index}</td>
    <td>${e.nom} ${e.prenom}</td>
    <td>${fmt(e.dateNaissance)}</td>
    <td>${e.lieuNaissance}</td>
    <td>${e.matricule}</td>
    <td>${LIBELLES_GRADE[grade] ?? grade}</td>
    <td>${e.sexe}</td>
    <td>${e.domaineRecherche ?? ''}</td>
    <td>${nomDepartement}</td>
    <td>${fmt(e.datePriseService)}</td>
    <td>${anneeRetraitePrevue}</td>
    <td>${e.estResident ? 'Oui' : 'Non'}</td>
    <td>${e.contratCollaboration ? 'Oui' : 'Non'}</td>
    <td>${e.departementOrigine?.region.nom ?? ''}</td>
    <td>${e.departementOrigine?.nom ?? ''}</td>
    <td>${e.posteResponsabilite ?? ''}</td>
    <td>${e.telephone ?? ''}</td>
    <td>${e.email ?? ''}</td>
  </tr>`
}

const ENTETES = [
  'N°',
  'Noms et Prénoms',
  'Date de Naissance',
  'Lieu de Naissance',
  'Matricule solde',
  'Grade',
  'Sexe',
  'Domaine de Recherche',
  "Département d'attache",
  'Date de Prise de service',
  'Année de retraite',
  'Résident (Oui/Non)',
  'Contrat de Collaboration',
  "Région d'origine",
  "Département d'origine",
  'Poste de Responsabilité',
  'N° Téléphone',
  'Adresse Mail',
]

/**
 * Un <section> par établissement, avec saut de page forcé entre chacun.
 * Le titre décoratif n'apparaît qu'une fois par établissement ; les
 * en-têtes de colonnes (dans <thead>) se répètent nativement sur les
 * pages de continuation si un établissement dépasse une page — c'est le
 * navigateur qui gère ça, pas nous.
 */
function sectionEtablissement(etab: {
  nom: string
  departements: { nom: string; enseignants: unknown[] }[]
}): string {
  // Aplatir D'ABORD tous les enseignants de l'établissement (peu importe
  // leur département), puis grouper par grade — pas l'inverse. Grouper
  // par département en premier ferait dépendre l'ordre final de l'ordre
  // de traversée des départements, alors que le document de référence
  // trie par NOM à l'intérieur de chaque section de grade, en mélangeant
  // librement les départements (vérifié sur le rapport d'avancement
  // fourni : la section Chargés de Cours de FALSH est bien alphabétique
  // de A à N, sans regroupement par département visible).
  type EnseignantAvecDept = Parameters<typeof ligneTableau>[0] & { grade: string }
  const tousLesEnseignants = etab.departements.flatMap((dep) =>
    (dep.enseignants as EnseignantAvecDept[]).map((e) => ({
      enseignant: e,
      nomDepartement: dep.nom,
    }))
  )
  tousLesEnseignants.sort((a, b) => a.enseignant.nom.localeCompare(b.enseignant.nom, 'fr'))

  const parGrade = new Map<string, typeof tousLesEnseignants>()
  for (const entree of tousLesEnseignants) {
    const liste = parGrade.get(entree.enseignant.grade) ?? []
    liste.push(entree)
    parGrade.set(entree.enseignant.grade, liste)
  }

  // Numérotation CONTINUE sur tout l'établissement, à travers les
  // catégories de grade — vérifié sur le document de référence, où la
  // numérotation de FALSH va bien de 1 à 15 en franchissant la frontière
  // Professeurs → Maîtres de Conférences → Chargés de Cours, plutôt que
  // de repartir à 1 à chaque catégorie.
  let compteur = 0
  if (tousLesEnseignants.length === 0) {
    return ''
  }

  const corpsParGrade = ORDRE_GRADE.filter((g) => parGrade.has(g))
    .map((grade) => {
      const lignes = parGrade
        .get(grade)!
        .map(({ enseignant, nomDepartement }) => {
          compteur += 1
          return ligneTableau(enseignant, grade, compteur, nomDepartement)
        })
        .join('')
      return `
      <tr class="ligne-grade"><td colspan="${ENTETES.length}">${LIBELLES_GRADE[grade]}</td></tr>
      ${lignes}
    `
    })
    .join('')

  return `
    <section class="section-etablissement">
      <div class="header-preamble">
        <div class="header-left">Fichier des enseignants de l'Université de Ngaoundéré</div>
        <div class="header-right">UN/R/VR-EPDTIC/SG/DAAC/DEPE/SSPE</div>
      </div>
      <p class="titre-etablissement">${etab.nom}</p>
      <table>
        <thead><tr>${ENTETES.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${corpsParGrade}</tbody>
      </table>
    </section>`
}

export async function genererListeEnseignantsPdf(): Promise<Buffer> {
  const etablissements = await recupererDonnees()

  // ⚠️ Police décorative : à remplacer par la police EXACTE du document
  // Word source si vous l'avez (ex. via `next/font/local`). "Tangerine"
  // ci-dessous est un remplaçant approximatif, choisi sans certitude sur
  // une police visible seulement en photo — et probablement trop fine :
  // le modèle photographié a des traits épais et ornés. Si l'écart saute
  // aux yeux, essayez d'abord "Rouge Script" ou "Berkshire Swash" (Google
  // Fonts), plus proches en graisse, avant de chercher plus loin.
  const html = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 7.5pt; color: #000; margin: 0; }
      .page { width: 100%; padding: 14mm 10mm; }
      .header-preamble {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 10px;
        font-size: 8pt;
      }
      .header-left, .header-right { width: 48%; }
      .header-right { text-align: right; }
      .titre-etablissement {
        font-family: 'Lucida Calligraphy', 'Brush Script MT', 'Segoe Script', cursive;
        font-size: 26pt;
        text-align: center;
        margin: 0 0 8px;
      }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.2pt; }
      thead tr { background: #f2f2f2; }
      th, td {
        border: 0.5pt solid #000;
        padding: 3px 4px;
        vertical-align: middle;
      }
      th {
        font-weight: bold;
        text-align: center;
        padding: 4px 3px;
      }
      td { text-align: left; }
      td:nth-child(1), th:nth-child(1) { width: 2.8%; }
      td:nth-child(2), th:nth-child(2) { width: 13%; }
      td:nth-child(3), th:nth-child(3) { width: 6%; }
      td:nth-child(4), th:nth-child(4) { width: 6%; }
      td:nth-child(5), th:nth-child(5) { width: 7%; }
      td:nth-child(6), th:nth-child(6) { width: 6%; }
      td:nth-child(7), th:nth-child(7) { width: 5%; }
      td:nth-child(8), th:nth-child(8) { width: 12%; }
      td:nth-child(9), th:nth-child(9) { width: 10%; }
      td:nth-child(10), th:nth-child(10) { width: 7%; }
      td:nth-child(11), th:nth-child(11) { width: 5%; }
      td:nth-child(12), th:nth-child(12) { width: 5%; }
      td:nth-child(13), th:nth-child(13) { width: 6%; }
      td:nth-child(14), th:nth-child(14) { width: 6%; }
      td:nth-child(15), th:nth-child(15) { width: 8%; }
      td:nth-child(16), th:nth-child(16) { width: 7%; }
      td:nth-child(17), th:nth-child(17) { width: 8%; }
      td:nth-child(18), th:nth-child(18) { width: 10%; }
      .ligne-grade td {
        background: #c8dfb6;
        font-weight: bold;
        text-align: center;
        padding: 5px 4px;
        font-size: 7.7pt;
      }
      .section-etablissement { page-break-before: always; margin-top: 16px; }
      .section-etablissement:first-child { page-break-before: auto; }
      .section-etablissement:last-child { page-break-after: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    </style>
    <div class="page">
      ${etablissements.map(sectionEtablissement).join('')}
    </div>
  `

  return genererPdf(html, { paysage: true })
}
