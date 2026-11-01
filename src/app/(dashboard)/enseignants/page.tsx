import Link from 'next/link'
import {
  ArrowDown,
  ArrowUp,
  UserCheck,
  UserMinus,
  UserX,
  Users,
  FileDown,
  FileSpreadsheet,
  Plus,
  Pencil,
  X,
} from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'
import { Alerte } from '@/components/ui/alerte'
import Image from 'next/image'
import {
  recupererStatsEnseignants,
  recupererEffectifsParEtablissement,
  recupererEffectifsParGrade,
  recupererEnseignantsEligiblesRetraite,
  recupererEnseignantsProchesRetraite,
} from './donnees'
import { GraphiqueEffectifsParSexe } from '@/components/charts/graphique-effectifs-sexe'
import { GraphiqueEffectifsParGrade } from '@/components/charts/graphique-effectifs-grade'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { LIBELLES_STATUT_ENSEIGNANT } from '@/domain/enseignants/dossier'
import { formaterDateCourte } from '@/domain/dates/formaterDateCourte'
import { absenceActuelle, LIBELLES_TYPE_ABSENCE } from '@/domain/absences/etatAbsence'
import { aujourdhui } from '@/domain/dates/jourCivil'
import { lireFiltres } from '@/domain/enseignants/recherche/lireFiltres'
import type { ParametresUrl } from '@/domain/enseignants/recherche/lireFiltres'
import { paginer } from '@/domain/enseignants/recherche/paginer'
import { adresseSansPuce, decrirePuces } from '@/domain/enseignants/recherche/puces'
import { selectionnerDossiers } from '@/domain/enseignants/recherche/selectionner'
import type { LigneRecherche } from '@/domain/enseignants/recherche/trier'
import { adresseListe, valeursDeFormulaire } from '@/domain/enseignants/recherche/versParametres'
import type { CleTri, FiltresEnseignants } from '@/domain/enseignants/recherche/filtres'
import {
  chargerDossiers,
  chargerGrille,
  chargerReferentielsFiltres,
} from '@/lib/enseignants/chargerDossiers'
import { TAILLE_PAGE } from '@/lib/constantes'
import { PanneauFiltres } from './panneau-filtres'
import { RaccourcisListe } from './raccourcis-liste'

export default async function PageEnseignants({
  searchParams,
}: {
  searchParams: Promise<ParametresUrl>
}) {
  const filtres = lireFiltres(await searchParams)
  // « Aujourd'hui » est lu une fois, ici : la sélection et l'affichage s'accordent sur le même jour.
  const jourCourant = aujourdhui()

  const [
    dossiers,
    grille,
    referentiels,
    stats,
    effectifsEtablissement,
    effectifsGrade,
    eligiblesRetraite,
    prochesRetraite,
  ] = await Promise.all([
    chargerDossiers(),
    chargerGrille(),
    chargerReferentielsFiltres(),
    recupererStatsEnseignants(),
    recupererEffectifsParEtablissement(),
    recupererEffectifsParGrade(),
    recupererEnseignantsEligiblesRetraite(),
    recupererEnseignantsProchesRetraite(),
  ])

  // Tout est filtré, trié puis découpé en mémoire (voir chargerDossiers) : une page demandée
  // hors limites est ramenée à la dernière au lieu d'afficher un tableau vide.
  const resultat = paginer(
    selectionnerDossiers(dossiers, filtres, grille, jourCourant),
    filtres.page,
    TAILLE_PAGE
  )
  const filtresAffiches: FiltresEnseignants = { ...filtres, page: resultat.page }
  const puces = decrirePuces(filtres, referentiels)
  const nombreFiltresAvances = puces.filter((p) => !p.parametres.includes('recherche')).length

  return (
    <div className="space-y-8">
      <PageHeader title="Enseignants" description="Gestion des dossiers et effectifs permanents">
        <a
          href="/enseignants/liste-pdf"
          download
          className="border-border bg-card hover:bg-muted inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow-sm"
        >
          <FileDown size={16} />
          Exporter PDF
        </a>
        <Link
          href="/enseignants/nouveau"
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90"
        >
          <Plus size={16} />
          Nouvel enseignant
        </Link>
      </PageHeader>

      {eligiblesRetraite.length > 0 && (
        <Alerte
          ton="avertissement"
          role="alert"
          titre={`${eligiblesRetraite.length} enseignant(s) ont dépassé l'âge de retraite`}
        >
          <ul className="mt-2 flex flex-wrap gap-2">
            {eligiblesRetraite.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/enseignants/${e.id}`}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium hover:bg-amber-200"
                >
                  {e.nom} {e.prenom}
                </Link>
              </li>
            ))}
          </ul>
        </Alerte>
      )}

      {prochesRetraite.length > 0 && (
        <Alerte
          ton="info"
          titre={`${prochesRetraite.length} enseignant(s) proche(s) de la retraite (2 ans)`}
        >
          <ul className="mt-2 flex flex-wrap gap-2">
            {prochesRetraite.slice(0, 8).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/enseignants/${e.id}`}
                  className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {e.nom} {e.prenom} ({e.dateRetraitePrevue.getUTCFullYear()})
                </Link>
              </li>
            ))}
            {prochesRetraite.length > 8 && (
              <li className="text-muted-foreground px-2 py-1 text-xs">
                +{prochesRetraite.length - 8} autre(s)
              </li>
            )}
          </ul>
        </Alerte>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total"
          value={stats.total}
          icon={Users}
          description="Enseignants enregistrés"
          color="blue"
        />
        <StatCard
          title="Actifs"
          value={stats.actifs}
          icon={UserCheck}
          description="En activité"
          color="green"
        />
        <StatCard
          title="Transférés"
          value={stats.transferes}
          icon={UserMinus}
          description="Hors UN"
          color="amber"
        />
        <StatCard
          title="Retraités"
          value={stats.retraites}
          icon={UserX}
          description="Départ à la retraite"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Effectifs par établissement"
          subtitle="Répartition hommes / femmes — actifs"
          className="lg:col-span-2"
        >
          <GraphiqueEffectifsParSexe donnees={effectifsEtablissement} />
        </ChartCard>
        <ChartCard title="Effectifs par grade" subtitle="Enseignants actifs">
          <GraphiqueEffectifsParGrade donnees={effectifsGrade} />
        </ChartCard>
      </div>

      <RaccourcisListe filtres={filtres} jourCourant={jourCourant} />

      <PanneauFiltres
        cle={adresseListe({ ...filtres, page: 1 })}
        valeurs={valeursDeFormulaire(filtres)}
        referentiels={referentiels}
        nombreFiltresAvances={nombreFiltresAvances}
        ouvert={nombreFiltresAvances > 0}
      />

      {puces.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
          {puces.map((puce) => (
            <Link
              key={puce.libelle}
              href={adresseSansPuce(filtresAffiches, puce)}
              title="Retirer ce filtre"
              className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            >
              {puce.libelle}
              <X size={12} aria-hidden="true" />
              <span className="sr-only">Retirer ce filtre</span>
            </Link>
          ))}
          <Link
            href="/enseignants"
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Tout effacer
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {puces.length > 0 && (
          <p className="text-muted-foreground text-sm" role="status">
            {resultat.total} enseignant{resultat.total > 1 ? 's' : ''} correspond
            {resultat.total > 1 ? 'ent' : ''} à ces critères.
          </p>
        )}
        <div className="ml-auto flex items-center gap-2" aria-label="Exporter cette sélection">
          <span className="text-muted-foreground text-xs">Exporter cette sélection</span>
          <a
            href={adresseListe({ ...filtresAffiches, page: 1 }, '/enseignants/selection-pdf')}
            download
            className="border-border bg-card hover:bg-muted inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-medium shadow-sm"
          >
            <FileDown size={14} aria-hidden="true" />
            PDF
          </a>
          <a
            href={adresseListe({ ...filtresAffiches, page: 1 }, '/enseignants/selection-csv')}
            download
            className="border-border bg-card hover:bg-muted inline-flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-medium shadow-sm"
          >
            <FileSpreadsheet size={14} aria-hidden="true" />
            Excel (CSV)
          </a>
        </div>
      </div>

      <div className="border-border bg-card overflow-x-auto rounded-2xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border bg-muted/30 text-muted-foreground border-b text-left">
              <EnTeteTri cle="nom" libelle="Nom" filtres={filtresAffiches} classe="px-4 py-3" />
              <th className="px-3 py-3 font-medium">Matricule</th>
              <EnTeteTri cle="grade" libelle="Grade" filtres={filtresAffiches} />
              <EnTeteTri cle="etablissement" libelle="Établissement" filtres={filtresAffiches} />
              <EnTeteTri cle="statut" libelle="Statut" filtres={filtresAffiches} />
              <EnTeteTri cle="retraite" libelle="Retraite" filtres={filtresAffiches} />
              <EnTeteTri cle="avancement" libelle="Avancement" filtres={filtresAffiches} />
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resultat.elements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10">
                  <EtatPage
                    icon={Users}
                    titre="Aucun enseignant trouvé"
                    message="Aucun enseignant ne correspond aux critères sélectionnés."
                    lienRetour="/enseignants"
                    labelRetour="Effacer les filtres"
                  />
                </td>
              </tr>
            ) : (
              resultat.elements.map((ligne) => (
                <LigneEnseignant key={ligne.dossier.id} ligne={ligne} jourCourant={jourCourant} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>
          Page {resultat.page} sur {resultat.totalPages} ({resultat.total} enseignant
          {resultat.total > 1 ? 's' : ''})
        </span>
        <div className="flex gap-2">
          {resultat.page > 1 && (
            <Link
              href={adresseListe({ ...filtresAffiches, page: resultat.page - 1 })}
              className="border-border bg-card hover:bg-muted rounded-2xl border px-3 py-1.5 shadow-sm"
            >
              Précédent
            </Link>
          )}
          {resultat.page < resultat.totalPages && (
            <Link
              href={adresseListe({ ...filtresAffiches, page: resultat.page + 1 })}
              className="border-border bg-card hover:bg-muted rounded-2xl border px-3 py-1.5 shadow-sm"
            >
              Suivant
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/** En-tête de colonne qui trie sur un clic, et inverse le sens au clic suivant. */
function EnTeteTri({
  cle,
  libelle,
  filtres,
  classe = 'px-3 py-3',
}: {
  cle: CleTri
  libelle: string
  filtres: FiltresEnseignants
  classe?: string
}) {
  const actif = filtres.tri === cle
  const sensSuivant = actif && filtres.ordre === 'asc' ? 'desc' : 'asc'
  return (
    <th
      className={`${classe} font-medium`}
      aria-sort={actif ? (filtres.ordre === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link
        href={adresseListe({ ...filtres, tri: cle, ordre: sensSuivant, page: 1 })}
        className={`hover:text-foreground inline-flex items-center gap-1 ${actif ? 'text-foreground' : ''}`}
      >
        {libelle}
        {actif &&
          (filtres.ordre === 'asc' ? (
            <ArrowUp size={12} aria-hidden="true" />
          ) : (
            <ArrowDown size={12} aria-hidden="true" />
          ))}
      </Link>
    </th>
  )
}

function LigneEnseignant({ ligne, jourCourant }: { ligne: LigneRecherche; jourCourant: Date }) {
  const { dossier: e, situation } = ligne
  // Un actif dont la date de retraite est atteinte n'est pas encore passé à « retraité » :
  // la date est mise en évidence pour qu'on pense à régulariser son dossier.
  const retraiteDepassee =
    e.statut === 'ACTIF' && situation.dateRetraite !== null && situation.dateRetraite <= jourCourant
  // Même mise en évidence pour un avancement d'échelon dont la date est atteinte.
  const avancementEchu =
    situation.dateProchainAvancement !== null && situation.dateProchainAvancement <= jourCourant
  return (
    <tr className="border-border hover:bg-muted/20 border-b last:border-0">
      <td className="text-foreground px-4 py-3 font-medium">
        <Link href={`/enseignants/${e.id}`} className="hover:text-primary flex items-center gap-3">
          {e.photoUrl ? (
            <Image
              src={e.photoUrl}
              alt={`${e.nom} ${e.prenom}`}
              className="rounded-2xl object-cover"
              width={40}
              height={40}
            />
          ) : (
            <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-bold">
              {e.prenom.charAt(0)}
              {e.nom.charAt(0)}
            </div>
          )}
          <span>
            {e.nom} {e.prenom}
          </span>
        </Link>
      </td>
      <td className="text-muted-foreground px-3 py-3">{e.matricule}</td>
      <td className="text-muted-foreground px-3 py-3">{LIBELLES_GRADE[e.grade] ?? e.grade}</td>
      <td className="text-muted-foreground px-3 py-3">{e.etablissement.abreviation}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <BadgeStatut statut={e.statut} />
          <BadgeAbsence absences={e.absences} jourCourant={jourCourant} />
        </div>
      </td>
      <td
        className={`px-3 py-3 ${retraiteDepassee ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}
        title={
          retraiteDepassee ? 'Date de retraite atteinte : le dossier est encore actif' : undefined
        }
      >
        {situation.dateRetraite ? formaterDateCourte(situation.dateRetraite) : '—'}
      </td>
      <td
        className={`px-3 py-3 ${avancementEchu ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}
        title={
          avancementEchu
            ? 'Date d’avancement atteinte : l’échelon n’a pas encore été relevé'
            : undefined
        }
      >
        {situation.dateProchainAvancement
          ? formaterDateCourte(situation.dateProchainAvancement)
          : e.statut === 'ACTIF' && situation.finDeGrade
            ? 'Fin de grade'
            : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/enseignants/${e.id}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            Voir
          </Link>
          {e.statut === 'ACTIF' && (
            <Link
              href={`/enseignants/${e.id}/modifier`}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
              title="Modifier"
            >
              <Pencil size={14} />
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}

function BadgeStatut({ statut }: { statut: keyof typeof LIBELLES_STATUT_ENSEIGNANT }) {
  const styles: Record<string, string> = {
    ACTIF: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    TRANSFERE: 'bg-amber-50 text-amber-700 ring-amber-100',
    RETRAITE: 'bg-muted text-muted-foreground ring-border',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[statut]}`}
    >
      {LIBELLES_STATUT_ENSEIGNANT[statut]}
    </span>
  )
}

/**
 * Pastille sous le statut quand l'enseignant est absent aujourd'hui (mission, congé), ou quand
 * le retour d'une absence dont la fin est passée n'a pas été enregistré.
 */
function BadgeAbsence({
  absences,
  jourCourant,
}: {
  absences: LigneRecherche['dossier']['absences']
  jourCourant: Date
}) {
  const actuelle = absenceActuelle(absences, jourCourant)
  if (!actuelle) return null
  const libelle = LIBELLES_TYPE_ABSENCE[actuelle.absence.type]
  const dateFin = formaterDateCourte(actuelle.absence.dateFin)
  return actuelle.etat === 'en-cours' ? (
    <span
      className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-100 ring-inset"
      title={`${libelle} jusqu'au ${dateFin}`}
    >
      Absent · {libelle}
    </span>
  ) : (
    <span
      className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-100 ring-inset"
      title={`${libelle} : fin prévue le ${dateFin}, retour non enregistré`}
    >
      Retour attendu · {libelle}
    </span>
  )
}
