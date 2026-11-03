'use client'

import { creerRapport, type EtatFormulaire } from '../actions'
import { useActionConservee } from '@/lib/action-conservee'
import { PageHeader } from '@/components/layout/page-header'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'
import { semestrePrecedent } from '@/domain/avancement/semestrePrecedent'
import { aujourdhui } from '@/domain/dates/jourCivil'

const etatInitial: EtatFormulaire = {}

export default function NouveauRapport() {
  const [state, surEnvoi, isPending] = useActionConservee(creerRapport, etatInitial)
  const defaut = semestrePrecedent(aujourdhui())

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader
        title="Nouveau rapport d'avancement"
        description="Générer la sélection automatique pour une session"
      />
      <form
        method="post"
        onSubmit={surEnvoi}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex max-w-lg flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Édition (numéro de session)
            <input name="numero" placeholder="55ème" required className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Début de période
            <input type="date" name="periodeDebut" defaultValue={defaut.debut} required className={classeChamp} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Fin de période
            <input type="date" name="periodeFin" defaultValue={defaut.fin} required className={classeChamp} />
          </label>
          {state.message && <p className="text-destructive text-sm">{state.message}</p>}
          <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
            {isPending ? 'Génération...' : 'Générer la sélection'}
          </button>
          {/* Après l'avertissement de chevauchement. « Générer la sélection » ci-dessus
              revérifie la période (si elle a été modifiée) ; celui-ci passe outre. */}
          {state.confirmationRequise && (
            <button
              type="submit"
              name="confirmerChevauchement"
              value="oui"
              disabled={isPending}
              className={classeBoutonPrimaire}
            >
              Créer quand même
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
