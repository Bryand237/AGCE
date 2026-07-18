import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ avancementId: string }> }) {
  const { avancementId } = await params
  const avancement = await prisma.historiqueAvancement.findUnique({
    where: { id: avancementId },
    select: { decisionGeneree: true, enseignant: { select: { matricule: true } } },
  })
  if (!avancement?.decisionGeneree) {
    return NextResponse.json({ message: 'Décision non générée.' }, { status: 404 })
  }
  return new NextResponse(Buffer.from(avancement.decisionGeneree), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="decision-${avancement.enseignant.matricule}.docx"`,
    },
  })
}