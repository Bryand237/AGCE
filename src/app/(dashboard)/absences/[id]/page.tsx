import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { recupererAbsenceDetail } from '../donnees'
import { supprimerAbsence } from '../actions'
import {
  FormulaireValidationAbsence,
  FormulaireTerminerAbsence,
  BlocAttestationAbsence,
} from '../formulaires'

const LIBELLES_TYPE: Record<string, string> = {
  MISSION: 'Mission',
  CONGE_MATERNITE: 'Congé de maternité',
  CONGE_MALADIE: 'Congé de maladie',
}

const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  EN_PERIODE: 'En période',
  DEPASSE: 'Dépassé',
  TERMINE: 'Terminé',
}

export default async function DetailAbsence({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const absence = await recupererAbsenceDetail(id)
  if (!absence) notFound()

  const supprimerAvecId = supprimerAbsence.bind(null, id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/absences" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
            Retour à la liste
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {absence.enseignant.nom} {absence.enseignant.prenom}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {LIBELLES_TYPE[absence.type]} · {absence.dateDebut.toLocaleDateString('fr-FR')} au{' '}
            {absence.dateFin.toLocaleDateString('fr-FR')}
          </p>
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {LIBELLES_STATUT[absence.statut]}
          </span>
        </div>
        <form action={supprimerAvecId}>
          <button type="submit" className="text-sm font-medium text-destructive hover:underline">
            Supprimer
          </button>
        </form>
      </div>

      {absence.statut === 'EN_ATTENTE' && (
        <FormulaireValidationAbsence
          absenceId={id}
          estCongeMaternite={absence.type === 'CONGE_MATERNITE'}
        />
      )}

      {(absence.statut === 'EN_PERIODE' || absence.statut === 'DEPASSE') && (
        <FormulaireTerminerAbsence absenceId={id} estDepasse={absence.statut === 'DEPASSE'} />
      )}

      {absence.statut === 'TERMINE' && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Retour enregistré le {absence.dateRetour?.toLocaleDateString('fr-FR')}.
          </p>
        </div>
      )}

      {absence.type === 'CONGE_MATERNITE' && absence.statut !== 'EN_ATTENTE' && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-foreground">Attestation</h2>
          <BlocAttestationAbsence
            absenceId={id}
            statutAttestation={absence.statutAttestation}
            numeroDecision={absence.numeroDecision}
          />
        </div>
      )}
    </div>
  )
}
