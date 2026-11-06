import { formaterDateLongue } from '@/domain/dates/formaterDateLongue'

/**
 * Ce que le numéro de décision et la date de signature impriment dans un gabarit Word.
 *
 * Tant que la décision n'est pas signée, le numéro et la date ne sont pas connus : le document
 * garde alors le blanc que le gabarit portait avant l'ajout des balises, à remplir à la main.
 * Une fois signée, le document est régénéré avec le numéro et la date saisis dans l'application,
 * si bien que le papier et la base ne peuvent plus diverger sans que cela se voie.
 */

/** Blanc du numéro dans les attestations (« DECISION N°--------------------------/UN/R/… »). */
export const BLANC_NUMERO_ATTESTATION = '--------------------------'
/** Blanc du numéro dans la décision d'avancement. */
export const BLANC_NUMERO_AVANCEMENT = '___________'
/** Blanc de la date dans les attestations (« Fait à Ngaoundéré, le ________________ »). */
export const BLANC_DATE_ATTESTATION = '________________'

/** Le numéro saisi (sans espaces autour), ou `blanc` quand il n'y en a pas encore. */
export function numeroDecisionImprime(numero: string | null | undefined, blanc: string): string {
  const net = numero?.trim()
  return net ? net : blanc
}

/** La date en toutes lettres (« 14 avril 2026 »), ou `blanc` quand elle n'est pas connue. */
export function dateSignatureImprimee(date: Date | null | undefined, blanc: string): string {
  return formaterDateLongue(date) || blanc
}
