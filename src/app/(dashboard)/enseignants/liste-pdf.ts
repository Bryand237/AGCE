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

function ligneTableau(e: {
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
}, grade: string, index: number, nomDepartement: string) {
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR')
  const anneeRetraitePrevue = calculerDateRetraitePrevue(e.dateNaissance, grade).getFullYear()
  return `<tr>
    <td>${index}</td>
    <td>${e.nom} ${e.prenom}</td>
    <td>${fmt(e.dateNaissance)}</td>
    <td>${e.lieuNaissance}</td>
    <td>${e.matricule}</td>
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
    (dep.enseignants as EnseignantAvecDept[]).map((e) => ({ enseignant: e, nomDepartement: dep.nom }))
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
      @font-face {
        font-family: 'Tangerine';
        src: url('file:///chemin/vers/Tangerine-Regular.ttf');
      }
      * { box-sizing: border-box; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 7.5pt; color: #000; margin: 0; }
      .reference { text-align: right; font-size: 8pt; margin-bottom: 4px; }
      .sous-titre { text-align: center; font-size: 10pt; margin: 0 0 8px; }
      .titre-etablissement {
        text-align: center;
        font-family: 'Tangerine', cursive;
        font-size: 26pt;
        margin: 4px 0 10px;
      }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td {
        border: 0.5pt solid #000;
        padding: 2px 3px;
        text-align: left;
        overflow-wrap: break-word;
      }
      th { font-size: 7pt; font-weight: bold; background: #f2f2f2; }
      .ligne-grade td {
        background: #c5e0b4;
        font-weight: bold;
        text-align: center;
        font-size: 8pt;
      }
      .section-etablissement { break-after: page; }
      .section-etablissement:last-child { break-after: auto; }
    </style>
    <div class="reference">UN/R/VR-EPDTIC/SG/DAAC/DEPE/SSPE</div>
    <p class="sous-titre">Fichier des enseignants de l'Université de Ngaoundéré</p>
    ${etablissements.map(sectionEtablissement).join('')}
  `

  return genererPdf(html, { paysage: true })
}
