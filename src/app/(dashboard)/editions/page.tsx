import {
  Briefcase,
  CalendarOff,
  FileDown,
  FileSpreadsheet,
  Handshake,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { aujourdhui, anneeDe } from '@/domain/dates/jourCivil'
import {
  ANNEE_MAX,
  ANNEE_MIN,
  DEFINITIONS_EDITION,
  EDITION_INDISPONIBLE_DECES,
  lireAnneeEdition,
  messageEditionVide,
  selectionnerEdition,
  titreEdition,
} from '@/domain/editions/editions'
import type { DemandeEdition } from '@/domain/editions/editions'
import type { ParametresUrl } from '@/domain/enseignants/recherche/lireFiltres'
import { chargerDossiers, chargerGrille } from '@/lib/enseignants/chargerDossiers'
import {
  BOUTON_EDITION,
  CarteEdition,
  CarteEditionIndisponible,
  DecompteEtablissements,
  TelechargementsEdition,
} from './carte-edition'

const premier = (valeur: string | string[] | undefined) =>
  Array.isArray(valeur) ? valeur[0] : valeur

export default async function PageEditions({
  searchParams,
}: {
  searchParams: Promise<ParametresUrl>
}) {
  const parametres = await searchParams
  const jourCourant = aujourdhui()
  // Sur cette page, une année absente ou invalide revient à l'année en cours : ce n'est qu'une
  // valeur de départ du formulaire. Les téléchargements, eux, refusent une année invalide.
  const annee = lireAnneeEdition(premier(parametres.annee)) ?? anneeDe(jourCourant)

  const [dossiers, grille] = await Promise.all([chargerDossiers(), chargerGrille()])
  // Même sélection que les téléchargements : le décompte affiché est celui du PDF.
  const demandeRetraite = { cle: 'retraite', annee } as const
  const demandeTransferes: DemandeEdition = { cle: 'transferes' }
  const demandeCollaboration: DemandeEdition = { cle: 'collaboration' }
  const demandeConges: DemandeEdition = { cle: 'conges' }
  const demandeMissions: DemandeEdition = { cle: 'missions' }
  const selection = (demande: DemandeEdition) =>
    selectionnerEdition(demande, dossiers, grille, jourCourant)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Éditions"
        description="Listes officielles classées par établissement, à imprimer (PDF) ou à ouvrir dans Excel"
      />

      <CarteEdition
        icone={UserX}
        titre={DEFINITIONS_EDITION.retraite.titre}
        description={DEFINITIONS_EDITION.retraite.description}
      >
        <form action="/editions" method="get" className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="text-foreground block text-sm font-medium">
              Année de départ à la retraite
            </span>
            <input
              type="number"
              name="annee"
              defaultValue={annee}
              min={ANNEE_MIN}
              max={ANNEE_MAX}
              step={1}
              required
              inputMode="numeric"
              className="border-border bg-background focus:border-primary focus:ring-primary/15 w-32 rounded-2xl border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </label>
          <button type="submit" className={BOUTON_EDITION}>
            Afficher le décompte
          </button>
          <button type="submit" formAction="/editions/retraite/pdf" className={BOUTON_EDITION}>
            <FileDown size={16} aria-hidden="true" />
            PDF
          </button>
          <button type="submit" formAction="/editions/retraite/csv" className={BOUTON_EDITION}>
            <FileSpreadsheet size={16} aria-hidden="true" />
            Excel (CSV)
          </button>
        </form>

        <DecompteEtablissements
          intitule={titreEdition(demandeRetraite)}
          lignes={selection(demandeRetraite)}
          messageSiVide={messageEditionVide(demandeRetraite)}
        />
      </CarteEdition>

      <CarteEdition
        icone={UserMinus}
        titre={DEFINITIONS_EDITION.transferes.titre}
        description={DEFINITIONS_EDITION.transferes.description}
      >
        <TelechargementsEdition cle="transferes" />
        <DecompteEtablissements
          intitule={titreEdition(demandeTransferes)}
          lignes={selection(demandeTransferes)}
          messageSiVide={messageEditionVide(demandeTransferes)}
        />
      </CarteEdition>

      <CarteEdition
        icone={Handshake}
        titre={DEFINITIONS_EDITION.collaboration.titre}
        description={DEFINITIONS_EDITION.collaboration.description}
        avertissement={DEFINITIONS_EDITION.collaboration.avertissement}
      >
        <TelechargementsEdition cle="collaboration" />
        <DecompteEtablissements
          intitule={titreEdition(demandeCollaboration)}
          lignes={selection(demandeCollaboration)}
          messageSiVide={messageEditionVide(demandeCollaboration)}
        />
      </CarteEdition>

      <CarteEdition
        icone={CalendarOff}
        titre={DEFINITIONS_EDITION.conges.titre}
        description={DEFINITIONS_EDITION.conges.description}
      >
        <TelechargementsEdition cle="conges" />
        <DecompteEtablissements
          intitule={titreEdition(demandeConges)}
          lignes={selection(demandeConges)}
          messageSiVide={messageEditionVide(demandeConges)}
        />
      </CarteEdition>

      <CarteEdition
        icone={Briefcase}
        titre={DEFINITIONS_EDITION.missions.titre}
        description={DEFINITIONS_EDITION.missions.description}
        avertissement={DEFINITIONS_EDITION.missions.avertissement}
      >
        <TelechargementsEdition cle="missions" />
        <DecompteEtablissements
          intitule={titreEdition(demandeMissions)}
          lignes={selection(demandeMissions)}
          messageSiVide={messageEditionVide(demandeMissions)}
        />
      </CarteEdition>

      <CarteEditionIndisponible
        icone={Users}
        titre={EDITION_INDISPONIBLE_DECES.titre}
        description={EDITION_INDISPONIBLE_DECES.description}
        raison={EDITION_INDISPONIBLE_DECES.raison}
      />
    </div>
  )
}
