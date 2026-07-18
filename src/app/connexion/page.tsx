import { FormulaireConnexion } from './formulaire-connexion'

export default function PageConnexion() {
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
        <FormulaireConnexion />
      </div>
    </div>
  )
}
