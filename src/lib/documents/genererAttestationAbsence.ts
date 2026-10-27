import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { titreResponsable } from '@/domain/etablissements/titreResponsable'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { formaterDateLongue } from '@/domain/dates/formaterDateLongue'
import { nomCompletPourActe } from '@/domain/documents/nomCompletPourActe'
import { typographierValeurs } from '@/domain/documents/typographie'
import type { Absence, Enseignant, Departement, Etablissement } from '@/generated/prisma/client'
import { lireMotifMission } from '@/domain/absences/motifMission'

type Params = {
  absence: Pick<
    Absence,
    'dateDebut' | 'dateFin' | 'referenceCorrespondance' | 'dateDemandeInteressee' | 'motif'
  >
  enseignant: Pick<Enseignant, 'nom' | 'prenom' | 'grade' | 'sexe' | 'matricule'>
  departement: Pick<Departement, 'nom'>
  etablissement: Pick<Etablissement, 'nom' | 'type'>
}

const TEMPLATES: Record<string, string> = {
  CONGE_MATERNITE: 'attestation-conge-maternite.docx',
  CONGE_MALADIE: 'attestation-conge-maladie.docx',
  MISSION: 'attestation-mission.docx',
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

  // Établissement d'accueil et objet d'une mission : enregistrés ensemble dans le motif.
  const mission = lireMotifMission(absence.motif)
  const feminin = enseignant.sexe === 'F'

  doc.render(
    typographierValeurs({
      civilite: feminin ? 'Madame' : 'Monsieur',
      // Accords des gabarits qui ne figent pas le sexe (la décision de mission).
      interesse: feminin ? 'intéressée' : 'intéressé',
      autorise: feminin ? 'autorisée' : 'autorisé',
      nomComplet: nomCompletPourActe(enseignant.nom, enseignant.prenom),
      matricule: enseignant.matricule,
      gradeActuel: LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade,
      nomDepartement: departement.nom,
      nomEtablissement: etablissement.nom,
      titreResponsable: titreResponsable(etablissement.type),
      dateDebut: formaterDateLongue(absence.dateDebut),
      dateFin: formaterDateLongue(absence.dateFin),
      referenceCorrespondance: absence.referenceCorrespondance ?? '',
      dateDemandeInteressee: formaterDateLongue(absence.dateDemandeInteressee),
      lieuAccueil: mission.lieuAccueil,
      objetMission: mission.objet,
    })
  )

  return doc.toBuffer()
}
