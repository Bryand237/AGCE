import { prisma } from '@/lib/prisma'
import { genererPdf } from '@/lib/pdf/genererPdf'
import { construireHtmlFichierEnseignants } from '@/lib/pdf/liste/fichierEnseignants'

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

/**
 * Fichier des enseignants en activité : un établissement par page, les enseignants regroupés par
 * grade. La composition de la liste est dans lib/pdf/liste/fichierEnseignants.ts et la mise en
 * page dans lib/pdf/liste/documentListe.ts (partagée avec toutes les autres listes imprimées).
 */
export async function genererListeEnseignantsPdf(): Promise<Buffer> {
  const etablissements = await recupererDonnees()
  return genererPdf(construireHtmlFichierEnseignants(etablissements), { paysage: true })
}
