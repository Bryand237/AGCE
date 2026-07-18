/** "Doyen" pour une faculté, "Directeur" pour une école — utilisé dans
 * la correspondance administrative citée par les attestations. */
export function titreResponsable(type: 'ECOLE' | 'FACULTE'): string {
  return type === 'FACULTE' ? 'Doyen' : 'Directeur'
}