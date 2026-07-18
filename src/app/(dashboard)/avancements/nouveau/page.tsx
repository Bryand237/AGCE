'use client'

import { useActionState } from 'react'
import { creerRapport, type EtatFormulaire } from '../actions'
import { PageHeader } from '@/components/layout/page-header'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

function semestrePrecedentParDefaut() {
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  if (maintenant.getMonth() >= 6) return { debut: `${annee}-01-01`, fin: `${annee}-06-30` }
  return { debut: `${annee - 1}-07-01`, fin: `${annee - 1}-12-31` }
}

export default function NouveauRapport() {
  const [state, formAction, isPending] = useActionState(creerRapport, etatInitial)
  const defaut = semestrePrecedentParDefaut()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader
        title="Nouveau rapport d'avancement"
        description="Générer la sélection automatique pour une session"
      />
      <form action={formAction} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
        </div>
      </form>
    </div>
  )
}
