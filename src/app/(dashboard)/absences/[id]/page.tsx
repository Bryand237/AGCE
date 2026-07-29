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
          <Link
            href="/absences"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Retour à la liste
          </Link>
          <h1 className="text-foreground text-2xl font-bold">
            {absence.enseignant.nom} {absence.enseignant.prenom}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {LIBELLES_TYPE[absence.type]} · {absence.dateDebut.toLocaleDateString('fr-FR')} au{' '}
            {absence.dateFin.toLocaleDateString('fr-FR')}
          </p>
          <span className="bg-primary/10 text-primary mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium">
            {LIBELLES_STATUT[absence.statut]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/absences/${id}/modifier`}
            className="text-primary text-sm font-medium hover:underline"
          >
            Modifier
          </Link>
          <form action={supprimerAvecId}>
            <button type="submit" className="text-destructive text-sm font-medium hover:underline">
              Supprimer
            </button>
          </form>
        </div>
      </div>

      {absence.statut === 'EN_ATTENTE' && (
        <FormulaireValidationAbsence
          absenceId={id}
          estCongeMaternite={absence.type === 'CONGE_MATERNITE'}
        />
      )}

      {absence.type === 'CONGE_MATERNITE' &&
        (absence.statut === 'EN_PERIODE' || absence.statut === 'DEPASSE') && (
          <div className="border-border bg-card rounded-2xl border p-6 shadow-sm">
            <h2 className="text-foreground mb-4 text-sm font-bold">Attestation</h2>
            <BlocAttestationAbsence
              absenceId={id}
              statutAttestation={absence.statutAttestation}
              numeroDecision={absence.numeroDecision}
            />
          </div>
        )}

      {(absence.statut === 'EN_PERIODE' || absence.statut === 'DEPASSE') &&
        (absence.type !== 'CONGE_MATERNITE' || absence.statutAttestation === 'VALIDEE' ? (
          <FormulaireTerminerAbsence absenceId={id} estDepasse={absence.statut === 'DEPASSE'} />
        ) : (
          <div className="border-border bg-card rounded-2xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm">
              La fin d’absence ne peut être enregistrée qu’après validation de l’attestation.
            </p>
          </div>
        ))}

      {absence.statut === 'TERMINE' && (
        <div className="border-border bg-card rounded-2xl border p-5 shadow-sm">
          <p className="text-muted-foreground text-sm">
            Retour enregistré le {absence.dateRetour?.toLocaleDateString('fr-FR')}.
          </p>
        </div>
      )}
    </div>
  )
}
