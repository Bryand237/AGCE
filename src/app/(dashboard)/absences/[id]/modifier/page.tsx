'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererAbsenceDetail } from '../../donnees'
import { FormulaireModifierAbsence } from '../../formulaires'
import { classeFormulaire } from '@/lib/ui-classes'

export default async function ModifierAbsencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const absence = await recupererAbsenceDetail(id)
  if (!absence) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/absences/${id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Retour à l’absence
          </Link>
          <h1 className="text-foreground mt-3 text-2xl font-bold">
            Modifier l’absence de {absence.enseignant.nom} {absence.enseignant.prenom}
          </h1>
        </div>
      </div>

      <section className={classeFormulaire}>
        <FormulaireModifierAbsence
          absenceId={id}
          dateDebut={absence.dateDebut.toISOString().slice(0, 10)}
          dateFin={absence.dateFin.toISOString().slice(0, 10)}
          motif={absence.motif}
        />
      </section>
    </div>
  )
}
