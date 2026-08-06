'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import EtatPage from '@/components/etats/etat-page'

export default function ErrorClient({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const message = error?.digest
    ? `Référence : ${error.digest}`
    : 'Réessayez, ou contactez le support si le problème persiste.'

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-6 px-4 text-center">
        <EtatPage
          icon={AlertTriangle}
          titre="Une erreur est survenue"
          message={message}
          tonalite="danger"
        />

        <div>
          <button
            onClick={() => reset()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  )
}
