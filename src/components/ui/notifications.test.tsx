import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FournisseurNotifications,
  NotificateurUrl,
  useNotifier,
  useReussiteNotifiee,
} from './notifications'

const navigation = vi.hoisted(() => ({ parametres: new URLSearchParams() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => navigation.parametres }))

function Declencheur({
  ton,
  message,
}: {
  ton: 'succes' | 'avertissement' | 'erreur'
  message: string
}) {
  const notifier = useNotifier()
  return <button onClick={() => notifier({ ton, message })}>{`envoyer ${message}`}</button>
}

function rendre(...enfants: ReactNode[]) {
  return render(
    <FournisseurNotifications>
      {enfants.map((enfant, rang) => (
        <Fragment key={rang}>{enfant}</Fragment>
      ))}
    </FournisseurNotifications>
  )
}

describe('notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche un message, qui disparaît seul au bout de 6 secondes', () => {
    rendre(<Declencheur ton="succes" message="Rapport créé." />)
    fireEvent.click(screen.getByRole('button', { name: 'envoyer Rapport créé.' }))
    expect(screen.getByText('Rapport créé.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6100)
    })
    expect(screen.queryByText('Rapport créé.')).toBeNull()
  })

  it('garde un avertissement jusqu’à sa fermeture', () => {
    rendre(<Declencheur ton="avertissement" message="Photo non enregistrée." />)
    fireEvent.click(screen.getByRole('button', { name: /envoyer/ }))

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('Photo non enregistrée.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
    expect(screen.queryByText('Photo non enregistrée.')).toBeNull()
  })

  it('annonce une erreur comme une alerte', () => {
    rendre(<Declencheur ton="erreur" message="Échec." />)
    fireEvent.click(screen.getByRole('button', { name: /envoyer/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Échec.')
  })

  it('ne répète pas un message identique déjà affiché', () => {
    rendre(<Declencheur ton="succes" message="Rapport créé." />)
    const bouton = screen.getByRole('button', { name: /envoyer/ })
    fireEvent.click(bouton)
    fireEvent.click(bouton)
    expect(screen.getAllByText('Rapport créé.')).toHaveLength(1)
  })

  it('affiche trois messages au plus : le plus ancien cède la place', () => {
    rendre(
      <Declencheur key="1" ton="avertissement" message="Un" />,
      <Declencheur key="2" ton="avertissement" message="Deux" />,
      <Declencheur key="3" ton="avertissement" message="Trois" />,
      <Declencheur key="4" ton="avertissement" message="Quatre" />
    )
    for (const message of ['Un', 'Deux', 'Trois', 'Quatre']) {
      fireEvent.click(screen.getByRole('button', { name: `envoyer ${message}` }))
    }
    expect(screen.queryByText('Un')).toBeNull()
    expect(screen.getByText('Deux')).toBeInTheDocument()
    expect(screen.getByText('Quatre')).toBeInTheDocument()
  })

  it('suspend la disparition tant que la souris est sur le message', () => {
    rendre(<Declencheur ton="succes" message="Rapport créé." />)
    fireEvent.click(screen.getByRole('button', { name: /envoyer/ }))
    const message = screen.getByText('Rapport créé.')

    fireEvent.mouseEnter(message.parentElement as HTMLElement)
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    expect(screen.getByText('Rapport créé.')).toBeInTheDocument()

    fireEvent.mouseLeave(message.parentElement as HTMLElement)
    act(() => {
      vi.advanceTimersByTime(6100)
    })
    expect(screen.queryByText('Rapport créé.')).toBeNull()
  })
})

describe('useReussiteNotifiee', () => {
  function Formulaire({
    action,
  }: {
    action: (etat: object, donnees: FormData) => Promise<object>
  }) {
    const envelopper = useReussiteNotifiee(action)
    return <button onClick={() => void envelopper({}, new FormData())}>go</button>
  }

  it('notifie la réussite et renvoie la réponse telle quelle', async () => {
    vi.useRealTimers()
    const reponse = { message: 'Enseignant réactivé.', succes: true }
    rendre(<Formulaire action={async () => reponse} />)
    fireEvent.click(screen.getByRole('button', { name: 'go' }))
    expect(await screen.findByText('Enseignant réactivé.')).toBeInTheDocument()
  })

  it('ne notifie pas un échec (le formulaire l’affiche lui-même)', async () => {
    vi.useRealTimers()
    rendre(<Formulaire action={async () => ({ message: 'Impossible.' })} />)
    fireEvent.click(screen.getByRole('button', { name: 'go' }))
    await act(async () => {})
    expect(screen.queryByText('Impossible.')).toBeNull()
  })
})

describe('NotificateurUrl', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('affiche le message du code puis retire le paramètre de l’adresse', () => {
    window.history.replaceState(null, '', '/avancements?msg=rapport_valide&page=2')
    navigation.parametres = new URLSearchParams('msg=rapport_valide&page=2')

    rendre(<NotificateurUrl />)

    expect(screen.getByText(/Rapport validé/)).toBeInTheDocument()
    expect(window.location.search).toBe('?page=2')
  })

  it('ignore un code inconnu, sans rien afficher, et nettoie l’adresse', () => {
    window.history.replaceState(null, '', '/avancements?msg=inconnu')
    navigation.parametres = new URLSearchParams('msg=inconnu')

    rendre(<NotificateurUrl />)

    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('[aria-live] > div')).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('ne fait rien sans paramètre', () => {
    window.history.replaceState(null, '', '/avancements?page=2')
    navigation.parametres = new URLSearchParams('page=2')

    rendre(<NotificateurUrl />)

    expect(document.querySelector('[aria-live] > div')).toBeNull()
    expect(window.location.search).toBe('?page=2')
  })
})
