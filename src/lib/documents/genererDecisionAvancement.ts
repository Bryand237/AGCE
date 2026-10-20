import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import fs from 'fs'
import path from 'path'
import { formaterPositionDecision } from '@/domain/avancement/formaterPositionDecision'
import { formaterClasseEchelonIndice } from '@/domain/avancement/formaterClasseEchelonIndice'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { formaterDateLongue } from '@/domain/dates/formaterDateLongue'
import { nomCompletPourActe } from '@/domain/documents/nomCompletPourActe'
import { typographierValeurs } from '@/domain/documents/typographie'
import type { EchelonIndiciaire, Enseignant, SessionConseil } from '@/generated/prisma/client'

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

  doc.render(
    typographierValeurs({
      civilite: enseignant.sexe === 'F' ? 'Madame' : 'Monsieur',
      nomComplet: nomCompletPourActe(enseignant.nom, enseignant.prenom),
      matricule: enseignant.matricule,
      gradeActuel: LIBELLES_GRADE[enseignant.grade] ?? enseignant.grade,
      ancienneClasseLibelle: formaterPositionDecision(anciennePosition),
      ancienIndice: anciennePosition.indice,
      ancienAvancementCEI: formaterClasseEchelonIndice(anciennePosition),
      dateAncienEffet: formaterDateLongue(dateAncienEffet),
      dateNouvelEffet: formaterDateLongue(dateNouvelEffet),
      nouvelleClasseLibelle: formaterPositionDecision(nouvellePosition),
      nouvelIndice: nouvellePosition.indice,
      nouvelAvancementCEI: formaterClasseEchelonIndice(nouvellePosition),
      numeroDecision,
      referenceLoiFinances: rapport.referenceLoiFinances ?? '',
      referenceCirculaire: rapport.referenceCirculaire ?? '',
      dateSessionCU: formaterDateLongue(rapport.dateSessionCU),
      dateSessionCA: formaterDateLongue(rapport.dateSessionCA),
      dateSignature: formaterDateLongue(dateSignatureEffective),
    })
  )

  return doc.toBuffer()
}
