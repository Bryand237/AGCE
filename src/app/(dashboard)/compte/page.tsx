import { exigerUtilisateur } from '@/lib/auth'
import { identifiantsInitiaux } from '@/lib/comptes/identifiants'
import { PageHeader } from '@/components/layout/page-header'
import { classeCarte } from '@/lib/ui-classes'
import { FormulaireIdentifiants, FormulaireRetablissement } from './formulaires'

export default async function PageCompte() {
  const utilisateur = await exigerUtilisateur()
  // Seul l'identifiant initial est affiché, jamais le mot de passe.
  const initiaux = identifiantsInitiaux()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <PageHeader
        title="Mon compte"
        description="Modifier l'identifiant et le mot de passe de connexion"
      />

      <section className={`${classeCarte} flex flex-col gap-4 p-6`}>
        <h2 className="text-lg font-semibold">Identifiants de connexion</h2>
        <FormulaireIdentifiants nomUtilisateur={utilisateur.nomUtilisateur} />
      </section>

      <section className={`${classeCarte} flex flex-col gap-4 p-6`}>
        <h2 className="text-lg font-semibold">Rétablir les identifiants initiaux</h2>
        {initiaux ? (
          <FormulaireRetablissement nomUtilisateurInitial={initiaux.nomUtilisateur} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Indisponible : ADMIN_USERNAME et ADMIN_PASSWORD ne sont pas définis dans le fichier{' '}
            <code>.env</code>.
          </p>
        )}
      </section>

      <section className={`${classeCarte} flex flex-col gap-2 p-6 text-sm`}>
        <h2 className="text-lg font-semibold">Identifiants oubliés ?</h2>
        <p className="text-muted-foreground">
          Sans pouvoir vous connecter, cette page est inaccessible. Dans ce cas, ouvrez un terminal
          dans le dossier de l&apos;application et lancez :
        </p>
        <pre className="bg-muted rounded-xl px-3 py-2">npm run admin:reset</pre>
        <p className="text-muted-foreground">
          Le compte reprend l&apos;identifiant et le mot de passe du fichier <code>.env</code>{' '}
          (ADMIN_USERNAME, ADMIN_PASSWORD). Les données ne sont pas touchées.
        </p>
      </section>
    </div>
  )
}
