import { Alerte } from '@/components/ui/alerte'
import { FormulaireConnexion } from './formulaire-connexion'

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ initiaux?: string }>
}) {
  // Renvoyé par « Rétablir les identifiants initiaux » (page Mon compte).
  const { initiaux } = await searchParams
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 pt-12 shadow-lg">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-md">
            AGCE
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Content de vous revoir</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gestion de carrière des enseignants</p>
          </div>
        </div>
        {initiaux && (
          <Alerte ton="info" className="mb-4">
            Identifiants initiaux rétablis : connectez-vous avec l&apos;identifiant et le mot de
            passe du fichier <code>.env</code> (ADMIN_USERNAME, ADMIN_PASSWORD).
          </Alerte>
        )}
        <FormulaireConnexion />
        <details className="mt-6 text-sm text-muted-foreground">
          <summary className="cursor-pointer">Identifiants oubliés ?</summary>
          <p className="mt-2">
            Dans un terminal, depuis le dossier de l&apos;application, lancez{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">npm run admin:reset</code> : le compte
            reprend l&apos;identifiant et le mot de passe du fichier <code>.env</code>. Les données
            ne sont pas touchées. Après cinq essais manqués, la connexion est suspendue cinq
            minutes pour cet identifiant.
          </p>
        </details>
      </div>
    </div>
  )
}
