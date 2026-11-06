type SessionMetadonnees = {
  referenceLoiFinances: string | null
  referenceCirculaire: string | null
  dateSessionCU: Date | null
  dateSessionCA: Date | null
}

/** Champs requis dans le gabarit DOCX (mentions « Vu la loi… », sessions CU/CA). */
const CHAMPS: { cle: keyof SessionMetadonnees; libelle: string }[] = [
  { cle: 'referenceLoiFinances', libelle: 'la loi de finances' },
  { cle: 'referenceCirculaire', libelle: 'la circulaire MINFI' },
  { cle: 'dateSessionCU', libelle: 'la date de la session du CU' },
  { cle: 'dateSessionCA', libelle: 'la date de la session du CA' },
]

/**
 * Libellés des métadonnées du conseil encore absentes, dans l'ordre du formulaire. Une
 * métadonnée peut manquer à la création du rapport (texte non encore publié, session pas
 * encore tenue) : on peut l'enregistrer en plusieurs fois, et l'écran dit ce qui reste.
 */
export function metadonneesManquantes(session: SessionMetadonnees): string[] {
  return CHAMPS.filter(({ cle }) => !session[cle]).map(({ libelle }) => libelle)
}

export function metadonneesSessionCompletes(session: SessionMetadonnees): boolean {
  return metadonneesManquantes(session).length === 0
}
