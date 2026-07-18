import { genererListeEnseignantsPdf } from '../liste-pdf'

export async function GET() {
  const pdf = await genererListeEnseignantsPdf()
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="liste-enseignants.pdf"',
    },
  })
}
