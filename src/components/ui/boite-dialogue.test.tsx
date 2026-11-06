import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BoiteDialogue } from './boite-dialogue'

function boite(proprietes: Partial<Parameters<typeof BoiteDialogue>[0]> = {}) {
  const onFermer = vi.fn()
  const rendu = render(
    <BoiteDialogue
      ouvert
      onFermer={onFermer}
      titre="Supprimer cette absence ?"
      description="Cette action est irréversible."
      actions={
        <>
          <button type="button" data-focus-initial>
            Annuler
          </button>
          <button type="button">Supprimer</button>
        </>
      }
      {...proprietes}
    />
  )
  return { onFermer, ...rendu }
}

/** Le <dialog> lui-même : c'est lui qui reçoit « cancel » (Échap) et les clics sur le fond. */
function dialogue() {
  const element = document.querySelector('dialog')
  if (!element) throw new Error('<dialog> introuvable')
  return element
}

describe('BoiteDialogue', () => {
  it("ne monte pas son contenu tant qu'elle est fermée", () => {
    boite({ ouvert: false })
    expect(screen.queryByText('Supprimer cette absence ?')).toBeNull()
    expect(dialogue()).not.toHaveAttribute('open')
  })

  it('s’ouvre, nommée par son titre et décrite par son texte', () => {
    boite()
    const fenetre = screen.getByRole('dialog', { name: 'Supprimer cette absence ?' })
    expect(fenetre).toHaveAccessibleDescription('Cette action est irréversible.')
  })

  it.each(['danger', 'avertissement'] as const)(
    'est une alerte (alertdialog) pour une question grave (ton « %s »)',
    (ton) => {
      boite({ ton })
      expect(screen.getByRole('alertdialog', { name: 'Supprimer cette absence ?' })).toBeVisible()
    }
  )

  it('met le focus sur l’élément marqué data-focus-initial', () => {
    boite()
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus()
  })

  it('demande la fermeture sur Échap, sans se fermer d’elle-même', () => {
    const { onFermer } = boite()
    const evenement = new Event('cancel', { cancelable: true })
    fireEvent(dialogue(), evenement)
    expect(onFermer).toHaveBeenCalledTimes(1)
    expect(evenement.defaultPrevented).toBe(true)
  })

  it('ignore Échap quand elle n’est pas fermable (action en cours)', () => {
    const { onFermer } = boite({ fermable: false })
    fireEvent(dialogue(), new Event('cancel', { cancelable: true }))
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('se ferme au clic sur le fond, sauf quand la question est grave', () => {
    const neutre = boite()
    fireEvent.mouseDown(dialogue())
    fireEvent.click(dialogue())
    expect(neutre.onFermer).toHaveBeenCalledTimes(1)
    neutre.unmount()

    for (const ton of ['danger', 'avertissement'] as const) {
      const grave = boite({ ton })
      fireEvent.mouseDown(dialogue())
      fireEvent.click(dialogue())
      expect(grave.onFermer).not.toHaveBeenCalled()
      grave.unmount()
    }
  })

  it('ne se ferme pas quand le clic commence dans la fenêtre (sélection de texte)', () => {
    const { onFermer } = boite()
    fireEvent.mouseDown(screen.getByText('Cette action est irréversible.'))
    fireEvent.click(dialogue())
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('ne ferme pas sur un clic dans la fenêtre', () => {
    const { onFermer } = boite()
    fireEvent.click(screen.getByText('Cette action est irréversible.'))
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('se referme quand `ouvert` repasse à faux', () => {
    const { rerender, onFermer } = boite()
    expect(dialogue()).toHaveAttribute('open')
    rerender(
      <BoiteDialogue
        ouvert={false}
        onFermer={onFermer}
        titre="Titre"
        actions={<button>OK</button>}
      />
    )
    expect(dialogue()).not.toHaveAttribute('open')
  })
})
