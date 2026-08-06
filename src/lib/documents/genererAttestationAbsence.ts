import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { titreResponsable } from '@/domain/etablissements/titreResponsable'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import type { Absence, Enseignant, Departement, Etablissement } from '@/generated/prisma/client'
import {
  formaterDureeSemaines,
  calculerDureeSemaines,
} from '@/domain/absences/formaterDureeSemaines'

function formaterDateFr(date: Date | null | undefined): string {
  return date
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
}

type Params = {
  absence: Pick<
    Absence,
    'dateDebut' | 'dateFin' | 'referenceCorrespondance' | 'dateDemandeInteressee'
  >
  enseignant: Pick<Enseignant, 'nom' | 'prenom' | 'grade' | 'sexe' | 'matricule'>
  departement: Pick<Departement, 'nom'>
  etablissement: Pick<Etablissement, 'nom' | 'type'>
}

// Seul CONGE_MATERNITE a un vrai template pour l'instant — voir plus bas.
const TEMPLATES: Record<string, string> = {
  CONGE_MATERNITE: 'attestation-conge-maternite.docx',
  CONGE_MALADIE: 'attestation-conge-maladie.docx',
}

export function genererAttestationAbsence(
  type: string,
  { absence, enseignant, departement, etablissement }: Params
): Buffer {
  const nomFichier = TEMPLATES[type]
  if (!nomFichier) throw new Error(`Pas encore de template d'attestation pour le type ${type}.`)

  const zip = new PizZip(
    fs.readFileSync(path.join(process.cwd(), 'templates', nomFichier), 'binary')
  )
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render({
    civilite: enseignant.sexe === 'F' ? 'Madame' : 'Monsieur',
    nomComplet: `${enseignant.nom} ${enseignant.prenom}`,
    matricule: enseignant.matricule,
    gradeActuel: LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade,
    nomDepartement: departement.nom,
    nomEtablissement: etablissement.nom,
    titreResponsable: titreResponsable(etablissement.type),
    dateDebut: formaterDateFr(absence.dateDebut),
    dateFin: formaterDateFr(absence.dateFin),
    dureeEnLettres: formaterDureeSemaines(
      calculerDureeSemaines(absence.dateDebut, absence.dateFin)
    ),
    referenceCorrespondance: absence.referenceCorrespondance ?? '',
    dateDemandeInteressee: formaterDateFr(absence.dateDemandeInteressee),
  })

  return doc.toBuffer()
}
