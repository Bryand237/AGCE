import { classeChamp } from '@/lib/ui-classes'

/**
 * Les deux informations que la décision de mission imprime : l'établissement d'accueil et l'objet.
 * Elles sont enregistrées ensemble dans le motif de l'absence (voir domain/absences/motifMission.ts).
 */
export function ChampsMission({
  lieuAccueil = '',
  objet = '',
}: {
  lieuAccueil?: string
  objet?: string
}) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        Établissement d&apos;accueil
        <input
          name="lieuAccueil"
          defaultValue={lieuAccueil}
          placeholder="Ex. : Université de Douala"
          className={classeChamp}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Objet de la mission
        <textarea
          name="objetMission"
          rows={3}
          defaultValue={objet}
          placeholder="Ex. : Participation au jury de soutenance de thèses"
          className={classeChamp}
        />
      </label>
    </>
  )
}
