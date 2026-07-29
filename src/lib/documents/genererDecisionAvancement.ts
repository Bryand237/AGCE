import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { formaterPosition } from '@/domain/avancement/formaterPosition'
import { formaterClasseEchelonIndice } from '@/domain/avancement/formaterClasseEchelonIndice'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import type { EchelonIndiciaire, Enseignant, SessionConseil } from '@/generated/prisma/client'

function formaterDateFr(date: Date | null | undefined): string {
  return date
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
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
    | 'referenceLoiFinances'
    | 'referenceCirculaire'
    | 'dateSessionCU'
    | 'dateSessionCA'
    | 'dateSignatureDecisions'
  >
  /** Date de signature effective — prioritaire sur session.dateSignatureDecisions (ex. validation individuelle). */
  dateSignature?: Date | null
}

/** Remplit templates/decision-avancement.docx */
export function genererDecisionAvancement({
  enseignant,
  anciennePosition,
  nouvellePosition,
  dateAncienEffet,
  dateNouvelEffet,
  numeroDecision,
  rapport,
  dateSignature,
}: Params): Buffer {
  const zip = new PizZip(
    fs.readFileSync(path.join(process.cwd(), 'templates', 'decision-avancement.docx'), 'binary')
  )
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

  const dateSignatureEffective = dateSignature ?? rapport.dateSignatureDecisions

  doc.render({
    civilite: enseignant.sexe === 'F' ? 'Madame' : 'Monsieur',
    nomComplet: `${enseignant.nom} ${enseignant.prenom}`,
    matricule: enseignant.matricule,
    gradeActuel: LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade,
    ancienneClasseLibelle: formaterPosition(anciennePosition),
    ancienIndice: anciennePosition.indice,
    ancienAvancementCEI: formaterClasseEchelonIndice(anciennePosition),
    dateAncienEffet: formaterDateFr(dateAncienEffet),
    dateNouvelEffet: formaterDateFr(dateNouvelEffet),
    nouvelleClasseLibelle: formaterPosition(nouvellePosition),
    nouvelIndice: nouvellePosition.indice,
    nouvelAvancementCEI: formaterClasseEchelonIndice(nouvellePosition),
    numeroDecision,
    referenceLoiFinances: rapport.referenceLoiFinances ?? '',
    referenceCirculaire: rapport.referenceCirculaire ?? '',
    dateSessionCU: formaterDateFr(rapport.dateSessionCU),
    dateSessionCA: formaterDateFr(rapport.dateSessionCA),
    dateSignature: formaterDateFr(dateSignatureEffective),
  })

  return doc.toBuffer()
}
