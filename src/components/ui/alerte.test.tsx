import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alerte } from './alerte'

describe('Alerte', () => {
  it('annonce une erreur tout de suite (rôle alert)', () => {
    render(<Alerte ton="erreur">Impossible d’enregistrer.</Alerte>)
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible d’enregistrer.')
  })

  it.each(['info', 'succes', 'avertissement'] as const)(
    'annonce une alerte « %s » sans interrompre (rôle status)',
    (ton) => {
      render(<Alerte ton={ton}>Message</Alerte>)
      expect(screen.getByRole('status')).toHaveTextContent('Message')
      expect(screen.queryByRole('alert')).toBeNull()
    }
  )

  it('laisse la page choisir le rôle', () => {
    render(
      <Alerte ton="avertissement" role="alert">
        Retraite dépassée
      </Alerte>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('affiche le titre, et une croix seulement si on peut la fermer', async () => {
    const onFermer = vi.fn()
    const { rerender } = render(<Alerte titre="Attention">Détail</Alerte>)
    expect(screen.getByText('Attention')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()

    rerender(
      <Alerte titre="Attention" onFermer={onFermer}>
        Détail
      </Alerte>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Fermer ce message' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})
