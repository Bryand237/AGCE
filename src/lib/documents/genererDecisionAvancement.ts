import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import type { EchelonIndiciaire, Enseignant, SessionConseil } from '@/generated/prisma/client'

function formaterDateFr(date: Date | null): string {
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}

type Params = {
  enseignant: Pick<Enseignant, 'nom' | 'prenom' | 'matricule' | 'grade' | 'sexe'>
  anciennePosition: EchelonIndiciaire
  nouvellePosition: EchelonIndiciaire
  dateAncienEffet: Date
  dateNouvelEffet: Date
  numeroDecision: string
  rapport: Pick<
    SessionConseil,
    'referenceLoiFinances' | 'referenceCirculaire' | 'dateSessionCU' | 'dateSessionCA' | 'dateSignatureDecisions'
  >
}

/** Remplit templates/decision-avancement.docx — voir templates/README.md pour le préparer. */
export function genererDecisionAvancement({
  enseignant, anciennePosition, nouvellePosition, dateAncienEffet, dateNouvelEffet, numeroDecision, rapport,
}: Params): Buffer {
  const zip = new PizZip(fs.readFileSync(path.join(process.cwd(), 'templates', 'decision-avancement.docx'), 'binary'))
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  doc.render({
    civilite: enseignant.sexe === 'F' ? 'Madame' : 'Monsieur',
    nomComplet: `${enseignant.nom} ${enseignant.prenom}`,
    matricule: enseignant.matricule,
    gradeActuel: LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade,
    ancienneClasseLibelle: formaterPosition(anciennePosition),
    ancienIndice: anciennePosition.indice,
    dateAncienEffet: formaterDateFr(dateAncienEffet),
    dateNouvelEffet: formaterDateFr(dateNouvelEffet),
    nouvelleClasseLibelle: formaterPosition(nouvellePosition),
    nouvelIndice: nouvellePosition.indice,
    numeroDecision,
    referenceLoiFinances: rapport.referenceLoiFinances ?? '',
    referenceCirculaire: rapport.referenceCirculaire ?? '',
    dateSessionCU: formaterDateFr(rapport.dateSessionCU),
    dateSessionCA: formaterDateFr(rapport.dateSessionCA),
    dateSignature: formaterDateFr(rapport.dateSignatureDecisions),
  })

  return doc.toBuffer()
}