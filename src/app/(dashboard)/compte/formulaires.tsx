'use client'

import { useActionState } from 'react'
import { modifierIdentifiants, retablirIdentifiantsInitiaux, type EtatFormulaire } from './actions'
import { useConfirmation } from '@/components/ui/confirmation'
import { classeBoutonDanger, classeBoutonPrimaire, classeChamp } from '@/lib/ui-classes'

const etatInitial: EtatFormulaire = {}

function Erreur({ state, champ }: { state: EtatFormulaire; champ: string }) {
  const message = state.errors?.[champ]?.[0]
  return message ? <p className="text-destructive text-sm">{message}</p> : null
}

/** Le message général : seulement quand aucun champ n'affiche déjà l'erreur. */
function Message({ state }: { state: EtatFormulaire }) {
  if (!state.message || state.errors) return null
  return (
    <p className={`text-sm ${state.succes ? 'text-primary' : 'text-destructive'}`}>
      {state.message}
    </p>
  )
}

export function FormulaireIdentifiants({ nomUtilisateur }: { nomUtilisateur: string }) {
  const [state, formAction, isPending] = useActionState(modifierIdentifiants, etatInitial)
  return (
    // `key` : après un changement d'identifiant, le champ repart de la nouvelle valeur.
    <form key={nomUtilisateur} action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Identifiant
        <input
          name="nomUtilisateur"
          defaultValue={nomUtilisateur}
          required
          autoComplete="username"
          className={classeChamp}
        />
        <Erreur state={state} champ="nomUtilisateur" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nouveau mot de passe
        <input
          type="password"
          name="nouveauMotDePasse"
          autoComplete="new-password"
          placeholder="Laisser vide pour ne pas le changer"
          className={classeChamp}
        />
        <Erreur state={state} champ="nouveauMotDePasse" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Confirmer le nouveau mot de passe
        <input
          type="password"
          name="confirmation"
          autoComplete="new-password"
          className={classeChamp}
        />
        <Erreur state={state} champ="confirmation" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mot de passe actuel (obligatoire pour enregistrer)
        <input
          type="password"
          name="motDePasseActuel"
          required
          autoComplete="current-password"
          className={classeChamp}
        />
        <Erreur state={state} champ="motDePasseActuel" />
      </label>
      <Message state={state} />
      <button type="submit" disabled={isPending} className={classeBoutonPrimaire}>
        {isPending ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}

export function FormulaireRetablissement({
  nomUtilisateurInitial,
}: {
  nomUtilisateurInitial: string
}) {
  const [state, formAction, isPending] = useActionState(retablirIdentifiantsInitiaux, etatInitial)
  const confirmation = useConfirmation({
    titre: 'Rétablir les identifiants initiaux ?',
    description: (
      <p>
        Votre identifiant et votre mot de passe actuels seront remplacés par ceux du fichier{' '}
        <code>.env</code>. Vous serez déconnecté.
      </p>
    ),
    libelleConfirmer: 'Rétablir',
    libelleEnCours: 'Rétablissement…',
    ton: 'avertissement',
    enCours: isPending,
  })
  return (
    <>
      <form action={formAction} onSubmit={confirmation.surEnvoi} className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          L&apos;identifiant redeviendra{' '}
          <strong className="text-foreground">{nomUtilisateurInitial}</strong> et le mot de passe
          celui du fichier <code>.env</code> (ADMIN_PASSWORD). Vous serez déconnecté et vous vous
          reconnecterez avec ces identifiants.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Mot de passe actuel
          <input
            type="password"
            name="motDePasseActuel"
            required
            autoComplete="current-password"
            className={classeChamp}
          />
          <Erreur state={state} champ="motDePasseActuel" />
        </label>
        <Message state={state} />
        <button type="submit" disabled={isPending} className={classeBoutonDanger}>
          {isPending ? 'Rétablissement...' : 'Rétablir les identifiants initiaux'}
        </button>
      </form>
      {confirmation.dialogue}
    </>
  )
}
