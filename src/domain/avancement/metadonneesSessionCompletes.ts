type SessionMetadonnees = {
  referenceLoiFinances: string | null
  referenceCirculaire: string | null
  dateSessionCU: Date | null
  dateSessionCA: Date | null
}

/** Champs requis dans le gabarit DOCX (mentions « Vu la loi… », sessions CU/CA). */
export function metadonneesSessionCompletes(session: SessionMetadonnees): boolean {
  return Boolean(
    session.referenceLoiFinances &&
      session.referenceCirculaire &&
      session.dateSessionCU &&
      session.dateSessionCA
  )
}
