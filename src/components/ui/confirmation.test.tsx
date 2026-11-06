import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useConfirmation } from './confirmation'
import { Recapitulatif, texteEnClair } from './recapitulatif'

/** Un formulaire comme ceux de l'application : le bouton « Ouvrir » est son bouton d'envoi. */
function Formulaire({
  enCours = false,
  surEnvoi,
  demander,
  avecRecapitulatif = false,
  ton = 'danger',
}: {
  enCours?: boolean
  avecRecapitulatif?: boolean
  ton?: 'danger' | 'avertissement' | 'neutre'
  surEnvoi: (evenement: FormEvent<HTMLFormElement>) => void
  demander?: (formulaire: HTMLFormElement) => boolean
}) {
  const confirmation = useConfirmation({
    titre: 'Supprimer cette absence ?',
    description: 'Cette action est irréversible.',
    libelleConfirmer: 'Supprimer',
    ton,
    enCours,
    surEnvoi,
    demander,
    recapitulatif: avecRecapitulatif
      ? (donnees) => (
          <Recapitulatif
            lignes={[{ libelle: 'Motif', valeur: texteEnClair(donnees.get('motif')) }]}
          />
        )
      : undefined,
  })
  return (
    <>
      <form onSubmit={confirmation.surEnvoi}>
        <input name="motif" defaultValue="doublon" />
        <button type="submit">Ouvrir</button>
      </form>
      {confirmation.dialogue}
    </>
  )
}

/**
 * Gestionnaire d'envoi de test : note l'envoi, empêche jsdom de « naviguer » et relève tout de
 * suite ce que contient le formulaire (React vide `currentTarget` dès la fin du gestionnaire).
 */
function envoiNote() {
  const saisies: FormDataEntryValue[] = []
  const surEnvoi = vi.fn((evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    saisies.push(new FormData(evenement.currentTarget).get('motif') ?? '')
  })
  return Object.assign(surEnvoi, { saisies })
}

describe('useConfirmation', () => {
  it("suspend le premier envoi et ouvre la fenêtre, sans lancer l'action", async () => {
    const surEnvoi = envoiNote()
    render(<Formulaire surEnvoi={surEnvoi} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(screen.getByRole('alertdialog', { name: 'Supprimer cette absence ?' })).toBeVisible()
    expect(surEnvoi).not.toHaveBeenCalled()
  })

  it('renvoie le formulaire, avec sa saisie, quand on confirme', async () => {
    const surEnvoi = envoiNote()
    render(<Formulaire surEnvoi={surEnvoi} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    expect(surEnvoi).toHaveBeenCalledTimes(1)
    expect(surEnvoi.saisies).toEqual(['doublon'])
  })

  it("n'envoie rien quand on annule, et redemande à l'envoi suivant", async () => {
    const surEnvoi = envoiNote()
    render(<Formulaire surEnvoi={surEnvoi} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(surEnvoi).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    expect(screen.getByRole('alertdialog')).toBeVisible()
    expect(surEnvoi).not.toHaveBeenCalled()
  })

  it("ne laisse pas passer l'envoi suivant sans question après une confirmation", async () => {
    const surEnvoi = envoiNote()
    render(<Formulaire surEnvoi={surEnvoi} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(surEnvoi).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(screen.getByRole('alertdialog')).toBeVisible()
    expect(surEnvoi).toHaveBeenCalledTimes(1)
  })

  it("reste ouverte pendant l'action, boutons figés, et se ferme à la fin", async () => {
    const surEnvoi = envoiNote()
    const { rerender } = render(<Formulaire surEnvoi={surEnvoi} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    rerender(<Formulaire surEnvoi={surEnvoi} enCours />)
    expect(screen.getByRole('alertdialog')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Supprimer…' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()

    rerender(<Formulaire surEnvoi={surEnvoi} enCours={false} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it("n'interrompt pas l'envoi quand `demander` répond non", async () => {
    const surEnvoi = envoiNote()
    render(<Formulaire surEnvoi={surEnvoi} demander={() => false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(surEnvoi).toHaveBeenCalledTimes(1)
  })

  it('relit la saisie du formulaire dans la fenêtre (récapitulatif)', async () => {
    render(<Formulaire surEnvoi={envoiNote()} avecRecapitulatif />)

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(screen.getByText('Motif')).toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toHaveTextContent('doublon')
  })

  it('met le focus sur Annuler quand la question est grave, sur Confirmer sinon', async () => {
    const grave = render(<Formulaire surEnvoi={envoiNote()} ton="avertissement" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus()
    grave.unmount()

    render(<Formulaire surEnvoi={envoiNote()} ton="neutre" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))
    expect(screen.getByRole('button', { name: 'Supprimer' })).toHaveFocus()
  })
})
