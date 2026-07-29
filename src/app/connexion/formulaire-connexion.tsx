'use client'

import { useActionState } from 'react'
import { seConnecter, type EtatFormulaire } from './actions'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function FormulaireConnexion() {
  const [state, formAction, isPending] = useActionState(seConnecter, etatInitial)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nom d&apos;utilisateur
        <input name="nomUtilisateur" required autoFocus className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe
        <input type="password" name="motDePasse" required className={classeChamp} />
      </label>
      {state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Connexion...' : 'Connexion'}
      </button>
    </form>
  )
}
