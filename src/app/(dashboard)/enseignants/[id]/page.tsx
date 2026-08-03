import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { recupererEnseignantDetail } from '../donnees'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import {
  calculerDateRetraitePrevue,
  estEligibleRetraite,
  estProcheRetraite,
} from '@/domain/enseignants/retraite'
import { FormulaireTransfert, FormulaireRetraite, BoutonReactiver } from '../formulaires'

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function DetailEnseignant({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const enseignant = await recupererEnseignantDetail(id)
  if (!enseignant) notFound()

  const retraitePrevue = calculerDateRetraitePrevue(enseignant.dateNaissance, enseignant.grade)
  const eligibleRetraite =
    enseignant.statut === 'ACTIF' && estEligibleRetraite(enseignant.dateNaissance, enseignant.grade)
  const procheRetraite =
    enseignant.statut === 'ACTIF' && estProcheRetraite(enseignant.dateNaissance, enseignant.grade)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/enseignants"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft size={16} />
            Retour à la liste
          </Link>
          <div className="flex items-center gap-3">
            {enseignant.photoUrl ? (
              <img
                src={enseignant.photoUrl}
                alt={`${enseignant.nom} ${enseignant.prenom}`}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold">
                {enseignant.prenom.charAt(0)}
                {enseignant.nom.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-foreground text-2xl font-bold">
                {enseignant.nom} {enseignant.prenom}
              </h1>
              <p className="text-muted-foreground text-sm">
                {enseignant.matricule} · {LIBELLES_GRADE[enseignant.grade]}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BadgeStatut statut={enseignant.statut} />
          {enseignant.statut === 'ACTIF' && (
            <Link
              href={`/enseignants/${id}/modifier`}
              className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Pencil size={16} />
              Modifier
            </Link>
          )}
        </div>
      </div>

      {eligibleRetraite && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
          role="alert"
        >
          Cet enseignant a dépassé l&apos;âge de retraite de son grade. Pensez à le marquer retraité
          ci-dessous.
        </div>
      )}

      {!eligibleRetraite && procheRetraite && (
        <div
          className="border-primary/20 bg-primary/5 text-foreground rounded-2xl border px-5 py-4 text-sm"
          role="status"
        >
          Retraite prévue le <strong>{formatDate(retraitePrevue)}</strong> — dans les 2 prochaines
          années.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
          <h2 className="text-foreground mb-4 text-sm font-bold">Informations personnelles</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Item label="Sexe" valeur={enseignant.sexe === 'M' ? 'Masculin' : 'Féminin'} />
            <Item label="Date de naissance" valeur={formatDate(enseignant.dateNaissance)} />
            <Item label="Lieu de naissance" valeur={enseignant.lieuNaissance} />
            <Item
              label="Département d'origine"
              valeur={
                enseignant.departementOrigine
                  ? `${enseignant.departementOrigine.nom} (${enseignant.departementOrigine.region.nom})`
                  : '—'
              }
            />
            <Item label="Diplôme" valeur={enseignant.diplomePlusEleve ?? '—'} />
            <Item label="Domaine de recherche" valeur={enseignant.domaineRecherche ?? '—'} />
          </dl>
        </section>

        <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
          <h2 className="text-foreground mb-4 text-sm font-bold">Affectation et carrière</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Item label="Établissement" valeur={enseignant.departement.etablissement.nom} />
            <Item label="Département" valeur={enseignant.departement.nom} />
            <Item label="Grade" valeur={LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade} />
            <Item
              label="Position"
              valeur={`${formaterPosition(enseignant.positionActuelle)} (indice ${enseignant.positionActuelle.indice})`}
            />
            <Item label="Prise de service" valeur={formatDate(enseignant.datePriseService)} />
            <Item label="Effet échelon" valeur={formatDate(enseignant.dateEffetEchelon)} />
            <Item label="Retraite prévue" valeur={formatDate(retraitePrevue)} />
            <Item label="Résident" valeur={enseignant.estResident ? 'Oui' : 'Non'} />
            <Item
              label="Contrat collaboration"
              valeur={enseignant.contratCollaboration ? 'Oui' : 'Non'}
            />
            <Item label="Poste resp." valeur={enseignant.posteResponsabilite ?? '—'} />
          </dl>
        </section>

        <section className="border-border bg-card rounded-2xl border p-6 shadow-sm lg:col-span-2">
          <h2 className="text-foreground mb-4 text-sm font-bold">Contact</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Item label="Téléphone" valeur={enseignant.telephone ?? '—'} />
            <Item label="Courriel" valeur={enseignant.email ?? '—'} />
          </dl>
        </section>
      </div>

      {enseignant.statut === 'ACTIF' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormulaireTransfert enseignantId={id} />
          <FormulaireRetraite
            enseignantId={id}
            dateRetraitePrevue={retraitePrevue.toISOString().slice(0, 10)}
          />
        </div>
      )}

      {enseignant.statut !== 'ACTIF' && (
        <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
          <h2 className="text-foreground mb-3 text-sm font-bold">Réactivation</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Statut actuel : {enseignant.statut === 'TRANSFERE' ? 'Transféré' : 'Retraité'}
            {enseignant.dateFinService && ` — depuis le ${formatDate(enseignant.dateFinService)}`}
          </p>
          <BoutonReactiver enseignantId={id} />
        </section>
      )}

      <section className="border-border bg-card rounded-2xl border p-6 shadow-sm">
        <h2 className="text-foreground mb-4 text-sm font-bold">Historique de carrière</h2>
        {enseignant.historique.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun avancement enregistré pour l&apos;instant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b text-left">
                  <th className="py-2 pr-4 font-medium">Édition</th>
                  <th className="py-2 pr-4 font-medium">Ancienne position</th>
                  <th className="py-2 pr-4 font-medium">Nouvelle position</th>
                  <th className="py-2 font-medium">Décision</th>
                </tr>
              </thead>
              <tbody>
                {enseignant.historique.map((h) => (
                  <tr key={h.id} className="border-border border-b last:border-0">
                    <td className="py-3 pr-4">{h.session?.numero ?? '—'}</td>
                    <td className="py-3 pr-4">
                      {formaterPosition(h.anciennePosition)} ({h.anciennePosition.indice})
                    </td>
                    <td className="py-3 pr-4">
                      {formaterPosition(h.nouvellePosition)} ({h.nouvellePosition.indice})
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/avancements/${h.sessionId}/${h.id}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {h.statutDecision ? 'Voir la décision' : 'Générer la décision'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

function BadgeStatut({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    ACTIF: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    TRANSFERE: 'bg-amber-50 text-amber-700 ring-amber-100',
    RETRAITE: 'bg-muted text-muted-foreground ring-border',
  }
  const libelles: Record<string, string> = {
    ACTIF: 'Actif',
    TRANSFERE: 'Transféré',
    RETRAITE: 'Retraité',
  }
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${styles[statut]}`}
    >
      {libelles[statut]}
    </span>
  )
}
