import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  CalendarDays,
  CalendarOff,
  Clock,
  Mail,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react'
import { recupererAbsenceDetail } from '../donnees'
import { supprimerAbsence } from '../actions'
import {
  FormulaireValidationAbsence,
  FormulaireTerminerAbsence,
  BlocAttestationAbsence,
} from '../formulaires'
import { TYPES_AVEC_ATTESTATION } from '@/domain/absences/typesAvecAttestation'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { StatCard } from '@/components/dashboard/stat-card'

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

const STYLES_STATUT: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 ring-amber-100',
  EN_PERIODE: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  DEPASSE: 'bg-destructive/10 text-destructive ring-destructive/20',
  TERMINE: 'bg-muted text-muted-foreground ring-border',
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function calculerDureeJours(debut: Date, fin: Date): number {
  const msParJour = 1000 * 60 * 60 * 24
  return Math.max(1, Math.round((fin.getTime() - debut.getTime()) / msParJour) + 1)
}

function calculerJoursRestants(fin: Date): number {
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const finNormalisee = new Date(fin)
  finNormalisee.setHours(0, 0, 0, 0)
  return Math.max(
    0,
    Math.round((finNormalisee.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24))
  )
}

export default async function DetailAbsence({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const absence = await recupererAbsenceDetail(id)
  if (!absence) notFound()

  const supprimerAvecId = supprimerAbsence.bind(null, id)
  const dureeJours = calculerDureeJours(absence.dateDebut, absence.dateFin)
  const joursRestants =
    absence.statut === 'EN_PERIODE' || absence.statut === 'DEPASSE'
      ? calculerJoursRestants(absence.dateFin)
      : null
  const { enseignant } = absence

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/absences"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} />
        Retour à la liste
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone gauche — enseignant concerné */}
        <aside className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 shadow-sm lg:col-span-1">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold">
              {enseignant.prenom.charAt(0)}
              {enseignant.nom.charAt(0)}
            </div>
            <div className="space-y-1">
              <Link
                href={`/enseignants/${enseignant.id}`}
                className="text-foreground hover:text-primary text-xl font-bold transition-colors"
              >
                {enseignant.nom} {enseignant.prenom}
              </Link>
              <p className="text-muted-foreground text-sm">{enseignant.matricule}</p>
              <p className="text-muted-foreground text-sm">
                {LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES_STATUT[absence.statut]}`}
            >
              {LIBELLES_STATUT[absence.statut]}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href={`/absences/${id}/modifier`}
                className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm"
              >
                <Pencil size={14} />
                Modifier
              </Link>
              <form action={supprimerAvecId}>
                <button
                  type="submit"
                  className="border-border bg-card text-destructive hover:bg-destructive/5 inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </form>
            </div>
          </div>

          <div className="border-border border-t pt-5">
            <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
              Affectation
            </h2>
            <dl className="space-y-3 text-sm">
              <Item label="Établissement" valeur={enseignant.departement.etablissement.nom} />
              <Item label="Département" valeur={enseignant.departement.nom} />
            </dl>
          </div>

          {(enseignant.telephone || enseignant.email) && (
            <div className="border-border border-t pt-5">
              <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
                Contact
              </h2>
              <dl className="space-y-3 text-sm">
                {enseignant.telephone && (
                  <ItemContact icon={Phone} label="Téléphone" valeur={enseignant.telephone} />
                )}
                {enseignant.email && (
                  <ItemContact icon={Mail} label="Courriel" valeur={enseignant.email} />
                )}
              </dl>
            </div>
          )}
        </aside>

        {/* Zone droite */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="border-primary/20 bg-primary/5 rounded-2xl border px-6 py-5 shadow-sm">
            <h2 className="text-foreground mb-2 text-sm font-bold">
              {LIBELLES_TYPE[absence.type]}
            </h2>
            <p className="text-foreground text-sm">
              Du <strong>{formatDate(absence.dateDebut)}</strong> au{' '}
              <strong>{formatDate(absence.dateFin)}</strong>
            </p>
            {absence.dateRetour && (
              <p className="text-muted-foreground mt-1 text-sm">
                Retour enregistré le {formatDate(absence.dateRetour)}
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Durée prévue"
              value={dureeJours}
              icon={CalendarDays}
              description="Jours calendaires"
              color="blue"
            />
            <StatCard
              title="Jours restants"
              value={joursRestants ?? '—'}
              icon={Clock}
              description={
                absence.statut === 'TERMINE'
                  ? 'Absence terminée'
                  : absence.statut === 'EN_ATTENTE'
                    ? 'En attente de validation'
                    : "Jusqu'à la date de fin"
              }
              color={absence.statut === 'DEPASSE' ? 'rose' : 'green'}
            />
            <StatCard
              title="Absences"
              value={enseignant._count.absences}
              icon={CalendarOff}
              description="Total pour cet enseignant"
              color="amber"
            />
          </div>

          <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
            <h2 className="text-foreground mb-4 text-sm font-bold">Détails de l&apos;absence</h2>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <Item label="Type" valeur={LIBELLES_TYPE[absence.type] ?? absence.type} />
              <Item label="Statut" valeur={LIBELLES_STATUT[absence.statut] ?? absence.statut} />
              <Item label="Date de début" valeur={formatDate(absence.dateDebut)} />
              <Item label="Date de fin" valeur={formatDate(absence.dateFin)} />
              <Item label="Motif" valeur={absence.motif ?? '—'} />
              <Item label="Enregistrée le" valeur={formatDate(absence.createdAt)} />
              {absence.dateValidation && (
                <Item
                  label="Validée le"
                  valeur={`${formatDate(absence.dateValidation)}${absence.auteurValidation ? ` (${absence.auteurValidation})` : ''}`}
                />
              )}
              {absence.referenceCorrespondance && (
                <Item label="Réf. correspondance" valeur={absence.referenceCorrespondance} />
              )}
              {absence.dateCorrespondance && (
                <Item label="Date correspondance" valeur={formatDate(absence.dateCorrespondance)} />
              )}
              {absence.dateDemandeInteressee && (
                <Item
                  label="Demande intéressée"
                  valeur={formatDate(absence.dateDemandeInteressee)}
                />
              )}
              {absence.numeroDecision && (
                <Item label="N° décision" valeur={absence.numeroDecision} />
              )}
              {absence.statutAttestation && (
                <Item label="Attestation" valeur={absence.statutAttestation} />
              )}
            </dl>
          </section>

          {absence.statut === 'EN_ATTENTE' && (
            <FormulaireValidationAbsence
              absenceId={id}
              estCongeMaternite={TYPES_AVEC_ATTESTATION.includes(absence.type)}
            />
          )}

          {TYPES_AVEC_ATTESTATION.includes(absence.type) &&
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
            (!TYPES_AVEC_ATTESTATION.includes(absence.type) ||
            absence.statutAttestation === 'VALIDEE' ? (
              <FormulaireTerminerAbsence absenceId={id} estDepasse={absence.statut === 'DEPASSE'} />
            ) : (
              <div className="border-border bg-card rounded-2xl border p-5 shadow-sm">
                <p className="text-muted-foreground text-sm">
                  La fin d&apos;absence ne peut être enregistrée qu&apos;après validation de
                  l&apos;attestation.
                </p>
              </div>
            ))}

          {absence.statut === 'TERMINE' && absence.dateRetour && (
            <div className="border-border bg-card rounded-2xl border p-5 shadow-sm">
              <p className="text-muted-foreground text-sm">
                Retour enregistré le {formatDate(absence.dateRetour)}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Item({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground mt-0.5 font-medium">{valeur}</dd>
    </div>
  )
}

function ItemContact({
  icon: Icon,
  label,
  valeur,
}: {
  icon: typeof Phone
  label: string
  valeur: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="text-foreground mt-0.5 font-medium">{valeur}</dd>
      </div>
    </div>
  )
}
