/**
 * Nom d'une personne tel qu'il s'écrit dans une décision : nom et prénoms en capitales
 * (« AKOA OWONA PLACIDE », « BILO’O BRIGITTE MARIE NOEL »), comme dans les originaux. Les noms sont
 * enregistrés tels qu'ils ont été saisis : sans cette mise en forme, une décision mêlerait
 * « AKOA OWONA » et « Placide ».
 */
export function nomCompletPourActe(nom: string, prenom: string): string {
  return `${nom} ${prenom}`.replace(/\s+/g, ' ').trim().toLocaleUpperCase('fr-FR')
}
