import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { genererPdf } from '@/lib/pdf/genererPdf'
import { lireLogo } from '@/lib/pdf/logo'
import { construireEtablissementsRapport } from '@/lib/pdf/lignesRapport'
import {
  construireHtmlRapport,
  EN_TETE_RAPPORT,
  MARGES_RAPPORT,
  PIED_DE_PAGE_RAPPORT,
  nomFichierRapport,
} from '@/lib/pdf/rapportAvancementHtml'
import { refuserSiNonConnecte } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refus = await refuserSiNonConnecte()
  if (refus) return refus

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
      // L'historique garde la position et la date d'avant : seul lui permet d'imprimer un
      // rapport validé (voir lignesRapport.ts).
      avancements: { include: { anciennePosition: true, nouvellePosition: true } },
    },
  })

  if (!rapport) {
    return new NextResponse('Rapport non trouvé', { status: 404 })
  }

  const html = construireHtmlRapport({
    numero: rapport.numero,
    periodeDebut: rapport.periodeDebut,
    periodeFin: rapport.periodeFin,
    logo: lireLogo(),
    etablissements: construireEtablissementsRapport(rapport),
  })

  const pdf = await genererPdf(html, {
    paysage: true,
    enTete: EN_TETE_RAPPORT,
    piedDePage: PIED_DE_PAGE_RAPPORT,
    marges: MARGES_RAPPORT,
  })

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichierRapport(rapport.numero)}"`,
    },
  })
}
