'use client'

import { seConnecter } from './actions'
import type { EtatFormulaire } from '@/lib/formulaires'
import { Alerte } from '@/components/ui/alerte'
import { useActionConservee } from '@/lib/action-conservee'
import { classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

export function FormulaireConnexion() {
  // L'identifiant reste dans le champ quand la connexion est refusée (ou limitée).
  const [state, surEnvoi, isPending] = useActionConservee(seConnecter, etatInitial)
  return (
    <form method="post" onSubmit={surEnvoi} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nom d&apos;utilisateur
        <input name="nomUtilisateur" required autoFocus className={classeChamp} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe
        <input type="password" name="motDePasse" required className={classeChamp} />
      </label>
      <div className="flex flex-col gap-1 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="seSouvenir" aria-describedby="aide-se-souvenir" />
          Rester connecté 30 jours
        </label>
        <p id="aide-se-souvenir" className="text-muted-foreground pl-6 text-xs">
          Sinon, la session se ferme au bout de 12 heures. À cocher seulement sur un ordinateur que
          vous seul utilisez.
        </p>
      </div>
      {state.message && <Alerte ton="erreur">{state.message}</Alerte>}
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Connexion...' : 'Connexion'}
      </button>
    </form>
  )
}
