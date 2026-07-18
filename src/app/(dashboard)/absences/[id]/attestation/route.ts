import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const absence = await prisma.absence.findUnique({
    where: { id },
    select: { decisionGeneree: true, enseignant: { select: { matricule: true } } },
  })
  if (!absence?.decisionGeneree) return NextResponse.json({ message: 'Attestation non générée.' }, { status: 404 })
  return new NextResponse(Buffer.from(absence.decisionGeneree), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="attestation-${absence.enseignant.matricule}.docx"`,
    },
  })
}