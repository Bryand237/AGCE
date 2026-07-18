'use client'

import { useActionState } from 'react'
import { ajouterSelection, validerRapport, rejeterRapport, type EtatFormulaire } from './actions'
import { classeBoutonDanger, classeBoutonPrimaire, classeChamp, classeFormulaire } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function FormulaireAjouterEnseignant({ rapportId }: { rapportId: string }) {
  const [state, formAction, isPending] = useActionState(
    ajouterSelection.bind(null, rapportId),
    etatInitial
  )
  return (
    <form action={formAction} className={classeFormulaire}>
      <p className="text-sm font-semibold text-foreground">Ajouter un enseignant</p>
      <div className="flex gap-3">
        <input
          name="matricule"
          placeholder="Matricule de l'enseignant"
          className={`${classeChamp} flex-1`}
        />
        <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
          {isPending ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
    </form>
  )
}

export function BlocValiderOuRejeter({ rapportId }: { rapportId: string }) {
  const [state, formActionValider, isPendingValider] = useActionState(
    validerRapport.bind(null, rapportId),
    etatInitial
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form action={formActionValider} className={classeFormulaire}>
        <p className="text-sm font-semibold text-foreground">Valider le rapport</p>
        <label className="flex flex-col gap-1 text-sm">
          Date de validation
          <input type="date" name="dateValidation" required className={classeChamp} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Auteur de la validation
          <input name="auteurValidation" required placeholder="Le Recteur" className={classeChamp} />
        </label>
        {state.message && <p className="text-destructive text-sm">{state.message}</p>}
        <button type="submit" disabled={isPendingValider} className={classeBoutonPrimaire}>
          {isPendingValider ? 'Validation...' : 'Valider'}
        </button>
      </form>

      <form action={rejeterRapport.bind(null, rapportId)} className={classeFormulaire}>
        <p className="text-sm font-semibold text-foreground">Rejeter</p>
        <label className="flex flex-col gap-1 text-sm">
          Motif
          <textarea name="motif" required rows={3} className={classeChamp} />
        </label>
        <button type="submit" className={classeBoutonDanger}>
          Rejeter
        </button>
      </form>
    </div>
  )
}
