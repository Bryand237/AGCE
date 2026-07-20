import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererPdf } from '@/lib/pdf/genererPdf'
import { formaterPositionCompacte } from '@/domain/avancement/formaterPositionCompacte'
import { LIBELLES_GRADE_PLURIEL, ORDRE_GRADE } from '@/domain/enseignants/grade'

const ENTETES = [
  'N°',
  'NOMS & PRÉNOMS',
  'MATRICULE',
  'DIPLÔME LE PLUS ÉLEVÉ',
  'DERNIER AVANCEMENT',
  'NOUVEL AVANCEMENT',
  'OBSERVATIONS',
  'AVIS',
]

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rapport = await prisma.sessionConseil.findUnique({
    where: { id },
    include: {
      selections: {
        include: {
          enseignant: {
            include: {
              departement: { include: { etablissement: true } },
              positionActuelle: true,
            },
          },
          positionProposee: true,
        },
      },
      avancements: {
        include: {
          enseignant: true,
          anciennePosition: true,
          nouvellePosition: true,
        },
      },
    },
  })

  if (!rapport) {
    return new NextResponse('Rapport non trouvé', { status: 404 })
  }

  const historiqueParEnseignant = new Map<
    string,
    { avisCU: boolean; avisCA: boolean; observations: string }
  >()
  for (const avancement of rapport.avancements) {
    historiqueParEnseignant.set(avancement.enseignantId, {
      avisCU: avancement.avisCU,
      avisCA: avancement.avisCA,
      observations: avancement.observations ?? '',
    })
  }

  const etablissementsMap = new Map<
    string,
    {
      nom: string
      enseignants: Array<{
        enseignantId: string
        nom: string
        prenom: string
        matricule: string
        diplomePlusEleve: string | null
        positionActuelle: {
          grade: string
          sousCategorie: string | null
          classe: number | null
          echelon: number | null
          indice: number
        }
        positionProposee: {
          grade: string
          sousCategorie: string | null
          classe: number | null
          echelon: number | null
          indice: number
        }
        dateEffetEchelon: Date
        avisCU?: boolean
        avisCA?: boolean
        observations?: string
      }>
    }
  >()

  for (const selection of rapport.selections) {
    const enseignant = selection.enseignant
    const etabNom = enseignant.departement.etablissement.nom
    const etab = etablissementsMap.get(etabNom) ?? { nom: etabNom, enseignants: [] }
    const historique = historiqueParEnseignant.get(selection.enseignantId)
    etab.enseignants.push({
      enseignantId: selection.enseignantId,
      nom: enseignant.nom,
      prenom: enseignant.prenom,
      matricule: enseignant.matricule,
      diplomePlusEleve: enseignant.diplomePlusEleve,
      positionActuelle: enseignant.positionActuelle,
      positionProposee: selection.positionProposee,
      dateEffetEchelon: enseignant.dateEffetEchelon,
      avisCU: historique?.avisCU,
      avisCA: historique?.avisCA,
      observations: historique?.observations,
    })
    etablissementsMap.set(etabNom, etab)
  }

  const etablissements = Array.from(etablissementsMap.values()).sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr')
  )

  const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR')
  const numeroEdition = `${rapport.numero.replace(/\s*ème$/i, '')}ème`
  const moisDebut = rapport.periodeDebut
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .toUpperCase()
  const moisFin = rapport.periodeFin
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .toUpperCase()

  const logoBase64 = readFileSync(join(process.cwd(), 'reference-docs', 'logo.jpeg'), 'base64')

  const html = `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Arial', Helvetica, sans-serif; font-size: 10pt; color: #000; margin: 0; }
      @page { size: A4 landscape; margin: 14mm 12mm; }

      .page-garde {
        height: calc(297mm - 28mm);
        padding: 16mm 18mm 18mm;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        page-break-after: always;
      }

      .entete-bilingue {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) 180px minmax(180px, 1fr);
        align-items: start;
        gap: 24px;
      }

      .bloc-entete {
        font-size: 9pt;
        line-height: 1.4;
      }

      .bloc-entete p { margin: 2px 0; }
      .bloc-entete .titre { font-weight: bold; margin-bottom: 4px; }
      .bloc-entete.gauche { text-align: left; }
      .bloc-entete.droite { text-align: right; }

      .center-logo {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 4px;
      }

      .center-logo img {
        max-width: 130px;
        height: auto;
        display: block;
      }

      .reference {
        text-align: center;
        font-size: 9pt;
        font-weight: bold;
        margin: 22px 0 14px;
      }

      .titre-rapport {
        text-align: center;
        font-size: 14pt;
        font-weight: bold;
        line-height: 1.4;
        margin: 0 auto;
        max-width: 80%;
      }

      .periode {
        text-align: center;
        font-size: 11pt;
        margin-top: 12px;
      }

      .bloc-signatures {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-top: 40px;
      }

      .signature {
        flex: 1;
        text-align: center;
        font-size: 9pt;
        line-height: 1.4;
      }

      .signature .titre {
        font-weight: bold;
        margin-bottom: 20px;
      }

      .signature .ligne {
        margin: 0 auto;
        margin-top: 40px;
        width: 84%;
        border-top: 1px solid #000;
        padding-top: 3px;
      }

      .page-corps {
      }

      .section-etablissement {
        margin-bottom: 18px;
        page-break-inside: avoid;
      }

      .section-etablissement.page-break {
        page-break-before: always;
      }

      .titre-etablissement {
        font-size: 11pt;
        font-weight: bold;
        text-align: left;
        margin-bottom: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8.2pt;
      }

      th, td {
        border: 0.5pt solid #000;
        padding: 3px 4px;
        vertical-align: middle;
      }

      th {
        background: #f2f2f2;
        font-weight: bold;
        text-align: center;
      }

      .header-row-2 th {
        background: #f7f7f7;
      }

      .ligne-grade td {
        background: #d9d9d9;
        font-weight: bold;
        text-align: left;
        padding: 5px 6px;
        font-size: 8.7pt;
      }

      .col-numero { width: 30px; text-align: center; }
      .col-noms { width: 180px; }
      .col-matricule { width: 90px; text-align: center; }
      .col-diplome { width: 120px; text-align: center; }
      .col-avancement-date { width: 72px; text-align: center; }
      .col-avancement-position { width: 90px; text-align: center; }
      .col-observations { width: 92px; }
      .col-avis-cu,
      .col-avis-ca { width: 38px; text-align: center; }

      .cellule-avancement {
        padding: 1px 2px;
        font-size: 7.7pt;
        line-height: 1.2;
      }

      .cellule-avis {
        text-align: center;
        font-size: 9pt;
        padding: 2px 0;
        min-height: 18px;
      }
    </style>

    <div class="page-garde">
      <div class="entete-bilingue">
        <div class="bloc-entete gauche">
          <p class="titre">RÉPUBLIQUE DU CAMEROUN</p>
          <p>Paix - Travail - Patrie</p>
          <p class="titre">MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR</p>
          <p class="titre">UNIVERSITÉ DE NGAOUNDÉRÉ</p>
          <p>B.P. 454 Fax : 237/22 25 40 01</p>
          <p>E-mail : ngaoundere_university@yahoo.fr</p>
          <p style="margin-top: 12px; font-weight: bold;">RECTORAT</p>
          <p>SECRETARIAT GENERAL</p>
          <p>DIRECTION DES AFFAIRES ACADÉMIQUES ET DE LA COOPÉRATION</p>
        </div>

        <div class="center-logo">
          <img src="data:image/jpeg;base64,${logoBase64}" alt="Logo Université de Ngaoundéré" />
        </div>

        <div class="bloc-entete droite">
          <p class="titre">REPUBLIC OF CAMEROON</p>
          <p>Peace - Work - Fatherland</p>
          <p class="titre">MINISTRY OF HIGHER EDUCATION</p>
          <p class="titre">THE UNIVERSITY OF NGAOUNDERÉ</p>
          <p>P.O. Box : 454 Fax : 237/22 25 40 01</p>
          <p>E-mail : ngaoundere_university@yahoo.fr</p>
          <p style="margin-top: 12px; font-weight: bold;">RECTOR'S OFFICE</p>
          <p>REGISTRAR'S OFFICE</p>
          <p>OFFICE OF ACADEMIC AFFAIRS AND CO-OPERATION</p>
        </div>
      </div>

      <div>
        <div class="titre-rapport">${numeroEdition} CONSEIL DE L'UNIVERSITÉ DE NGAOUNDÉRÉ</div>
        <div class="titre-rapport" style="margin-top: 14px; font-size: 13pt;">AVANCEMENT INDICIAIRE NORMAL DES ENSEIGNANTS</div>
        <div class="periode">De ${moisDebut} à ${moisFin}</div>
      </div>

    </div>

    <div class="page-corps">
      ${etablissements
        .map((etab, index) => {
          const tous = [...etab.enseignants].sort((a, b) => {
            const nomCompare = a.nom.localeCompare(b.nom, 'fr')
            return nomCompare !== 0 ? nomCompare : a.prenom.localeCompare(b.prenom, 'fr')
          })

          const parGrade = new Map<string, typeof tous>()
          for (const enseignant of tous) {
            const grade = enseignant.positionActuelle.grade
            const liste = parGrade.get(grade) ?? []
            liste.push(enseignant)
            parGrade.set(grade, liste)
          }

          let compteur = 0
          const lignes = ORDRE_GRADE.filter((grade) => parGrade.has(grade))
            .map((grade) => {
              const enseignantsGrade = parGrade.get(grade)!
              const lignesGrade = enseignantsGrade
                .map((enseignant) => {
                  compteur += 1
                  const ancienne = formaterPositionCompacte(enseignant.positionActuelle)
                  const nouvelle = formaterPositionCompacte(enseignant.positionProposee)

                  return `
                    <tr>
                      <td class="col-numero">${compteur}</td>
                      <td class="col-noms">${enseignant.nom} ${enseignant.prenom}</td>
                      <td class="col-matricule">${enseignant.matricule}</td>
                      <td class="col-diplome">${enseignant.diplomePlusEleve ?? ''}</td>
                      <td class="col-avancement-date cellule-avancement">${fmtDate(enseignant.dateEffetEchelon)}</td>
                      <td class="col-avancement-position cellule-avancement">${ancienne}</td>
                      <td class="col-avancement-date cellule-avancement">${fmtDate(rapport.periodeFin)}</td>
                      <td class="col-avancement-position cellule-avancement">${nouvelle}</td>
                      <td class="col-observations">${enseignant.observations ?? ''}</td>
                      <td class="col-avis-cu cellule-avis">${enseignant.avisCU ? '✓' : ''}</td>
                      <td class="col-avis-ca cellule-avis">${enseignant.avisCA ? '✓' : ''}</td>
                    </tr>`
                })
                .join('')

              return `
                <tr class="ligne-grade"><td colspan="11">${LIBELLES_GRADE_PLURIEL[grade]}</td></tr>
                ${lignesGrade}
              `
            })
            .join('')

          return `
            <div class="section-etablissement${index > 0 ? ' page-break' : ''}">
              <div class="titre-etablissement">${etab.nom}</div>
              <table>
                <thead>
                  <tr>
                    <th class="col-numero" rowspan="2">${ENTETES[0]}</th>
                    <th class="col-noms" rowspan="2">${ENTETES[1]}</th>
                    <th class="col-matricule" rowspan="2">${ENTETES[2]}</th>
                    <th class="col-diplome" rowspan="2">${ENTETES[3]}</th>
                    <th class="col-avancement-date" colspan="2">${ENTETES[4]}</th>
                    <th class="col-avancement-date" colspan="2">${ENTETES[5]}</th>
                    <th class="col-observations" rowspan="2">${ENTETES[6]}</th>
                    <th class="col-avis-cu" colspan="2">${ENTETES[7]}</th>
                  </tr>
                  <tr class="header-row-2">
                    <th class="col-avancement-date">Date</th>
                    <th class="col-avancement-position">C/E/Ind.</th>
                    <th class="col-avancement-date">Date</th>
                    <th class="col-avancement-position">C/E/Ind.</th>
                    <th class="col-avis-cu">CU</th>
                    <th class="col-avis-ca">CA</th>
                  </tr>
                </thead>
                <tbody>${lignes}</tbody>
              </table>
            </div>`
        })
        .join('')}
    </div>
  `

  const pdf = await genererPdf(html, {
    paysage: true,
    piedDePage: `<div style="font-size:8px; width:100%; text-align:center; color:#000;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-${rapport.numero}.pdf"`,
    },
  })
}
