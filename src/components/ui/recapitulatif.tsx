import type { ReactNode } from 'react'
import { formaterDateMoisEnLettres } from '@/domain/dates/formaterDateMoisEnLettres'
import { analyserDateIso } from '@/domain/dates/jourCivil'

/**
 * « 2 novembre 2026 » à partir de la valeur d'un champ date (« 2026-11-02 »). Lecture à la main,
 * sans passer par `new Date(texte)` : celui-ci interprète la date en heure universelle et peut
 * l'afficher un jour trop tôt selon le fuseau de l'ordinateur.
 */
export function dateEnClair(valeur: FormDataEntryValue | null | undefined): string {
  const date = analyserDateIso(typeof valeur === 'string' ? valeur : '')
  return date ? formaterDateMoisEnLettres(date) : '—'
}

/** Texte saisi, sans espaces autour ; « — » quand le champ est vide. */
export function texteEnClair(valeur: FormDataEntryValue | null | undefined): string {
  return typeof valeur === 'string' && valeur.trim() ? valeur.trim() : '—'
}

/** Les valeurs qu'une action va enregistrer, en lignes « libellé : valeur » (voir `useConfirmation`). */
export function Recapitulatif({ lignes }: { lignes: { libelle: string; valeur: ReactNode }[] }) {
  return (
    <dl className="border-border bg-muted/40 divide-border divide-y rounded-xl border text-sm">
      {lignes.map(({ libelle, valeur }) => (
        <div key={libelle} className="flex justify-between gap-4 px-3 py-2">
          <dt className="text-muted-foreground">{libelle}</dt>
          <dd className="text-foreground text-right font-medium">{valeur}</dd>
        </div>
      ))}
    </dl>
  )
}
