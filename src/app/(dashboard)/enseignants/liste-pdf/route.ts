import { genererListeEnseignantsPdf } from '../liste-pdf'
import { refuserSiNonConnecte } from '@/lib/auth'

export async function GET() {
  const refus = await refuserSiNonConnecte()
  if (refus) return refus

  const pdf = await genererListeEnseignantsPdf()
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="liste-enseignants.pdf"',
    },
  })
}
