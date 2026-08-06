import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CalendarDays, CalendarOff, Mail, Pencil, Phone, TrendingUp } from 'lucide-react'
import { recupererEnseignantDetail } from '../donnees'
import { recupererGrilleEchelonIndiciaire } from '@/app/(dashboard)/avancements/donnees'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { formaterPositionCompacte } from '@/domain/avancement/formaterPositionCompacte'
import { calculerProchainAvancementTheorique } from '@/domain/avancement/calculerProchainAvancementTheorique'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import {
  calculerDateRetraitePrevue,
  estEligibleRetraite,
  estProcheRetraite,
} from '@/domain/enseignants/retraite'
import { StatCard } from '@/components/dashboard/stat-card'
import { FormulaireTransfert, FormulaireRetraite, BoutonReactiver } from '../formulaires'

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function calculerAncienneteAnnees(datePriseService: Date): number {
  const aujourdhui = new Date()
  let annees = aujourdhui.getFullYear() - datePriseService.getFullYear()
  const mois = aujourdhui.getMonth() - datePriseService.getMonth()
  if (mois < 0 || (mois === 0 && aujourdhui.getDate() < datePriseService.getDate())) {
    annees--
  }
  return Math.max(0, annees)
}

export default async function DetailEnseignant({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [enseignant, grille] = await Promise.all([
    recupererEnseignantDetail(id),
    recupererGrilleEchelonIndiciaire(),
  ])
  if (!enseignant) notFound()

  const retraitePrevue = calculerDateRetraitePrevue(enseignant.dateNaissance, enseignant.grade)
  const eligibleRetraite =
    enseignant.statut === 'ACTIF' && estEligibleRetraite(enseignant.dateNaissance, enseignant.grade)
  const procheRetraite =
    enseignant.statut === 'ACTIF' && estProcheRetraite(enseignant.dateNaissance, enseignant.grade)

  const prochainAvancement = calculerProchainAvancementTheorique(
    enseignant.dateEffetEchelon,
    enseignant.grade,
    enseignant.positionActuelle.ordre,
    grille
  )

  const ancienneteAnnees = calculerAncienneteAnnees(enseignant.datePriseService)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Link
        href="/enseignants"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} />
        Retour à la liste
      </Link>

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone gauche — carte de profil */}
        <aside className="border-border bg-card flex flex-col gap-6 rounded-2xl border p-6 shadow-sm lg:col-span-1">
          <div className="flex flex-col items-center gap-4 text-center">
            {enseignant.photoUrl ? (
              <Image
                src={enseignant.photoUrl}
                alt={`${enseignant.nom} ${enseignant.prenom}`}
                className="rounded-2xl object-cover"
                width={96}
                height={96}
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold">
                {enseignant.prenom.charAt(0)}
                {enseignant.nom.charAt(0)}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-foreground text-xl font-bold">
                {enseignant.nom} {enseignant.prenom}
              </h1>
              <p className="text-muted-foreground text-sm">{enseignant.matricule}</p>
              <p className="text-muted-foreground text-sm">{LIBELLES_GRADE[enseignant.grade]}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <BadgeStatut statut={enseignant.statut} />
              {enseignant.statut === 'ACTIF' && (
                <Link
                  href={`/enseignants/${id}/modifier`}
                  className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm"
                >
                  <Pencil size={14} />
                  Modifier
                </Link>
              )}
            </div>
          </div>

          <div className="border-border border-t pt-5">
            <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
              Informations personnelles
            </h2>
            <dl className="space-y-3 text-sm">
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
          </div>

          <div className="border-border border-t pt-5">
            <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
              Contact
            </h2>
            <dl className="space-y-3 text-sm">
              <ItemContact icon={Phone} label="Téléphone" valeur={enseignant.telephone ?? '—'} />
              <ItemContact icon={Mail} label="Courriel" valeur={enseignant.email ?? '—'} />
            </dl>
          </div>

          <div className="border-border border-t pt-5">
            <h2 className="text-foreground mb-3 text-xs font-bold tracking-wide uppercase">
              Affectation et carrière
            </h2>
            <dl className="space-y-3 text-sm">
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
          </div>
        </aside>

        {/* Zone droite */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="border-primary/20 bg-primary/5 rounded-2xl border px-6 py-5 shadow-sm">
            <h2 className="text-foreground mb-2 text-sm font-bold">Prochain avancement</h2>
            {prochainAvancement.positionSuivante ? (
              <div className="space-y-1 text-sm">
                <p className="text-foreground">
                  Prochaine position théorique :{' '}
                  <strong>{formaterPositionCompacte(prochainAvancement.positionSuivante)}</strong>
                </p>
                <p className="text-muted-foreground">
                  Éligible à partir du {formatDate(prochainAvancement.dateEligibilite)}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Palier maximal atteint pour ce grade — un avancement de grade est nécessaire pour
                progresser plus loin.
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Ancienneté"
              value={ancienneteAnnees}
              icon={CalendarDays}
              description="Années depuis la prise de service"
              color="blue"
            />
            <StatCard
              title="Avancements"
              value={enseignant.historique.length}
              icon={TrendingUp}
              description="Avancements enregistrés"
              color="green"
            />
            <StatCard
              title="Absences"
              value={enseignant._count.absences}
              icon={CalendarOff}
              description="Absences enregistrées"
              color="amber"
            />
          </div>

          {enseignant.statut === 'ACTIF' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {enseignant.dateFinService &&
                  ` — depuis le ${formatDate(enseignant.dateFinService)}`}
                {enseignant.statut === 'TRANSFERE' &&
                  enseignant.lieuTransfert &&
                  ` — destination : ${enseignant.lieuTransfert}`}
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
                            href={`/avancements/${h.session?.id}/${h.id}`}
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
