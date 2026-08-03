import { LIBELLES_GRADE, ORDRE_GRADE } from '@/domain/enseignants/grade'
import { CHART_PALETTE } from './chart-palette'

/** Couleurs des séries par grade — utilisez la palette variée partagée */
export const GRADE_CHART_COLORS = {
  professeurs: CHART_PALETTE[0],
  maitreConferences: CHART_PALETTE[3],
  chargesCours: CHART_PALETTE[5],
  assistants: CHART_PALETTE[2],
} as const

export const GRADE_FILL: Record<string, string> = {
  PROFESSEUR: GRADE_CHART_COLORS.professeurs,
  MAITRE_DE_CONFERENCES: GRADE_CHART_COLORS.maitreConferences,
  CHARGE_DE_COURS: GRADE_CHART_COLORS.chargesCours,
  ASSISTANT: GRADE_CHART_COLORS.assistants,
}

export type DashboardStats = {
  totalEnseignants: number
  enseignantsActifs: number
  hommes: number
  femmes: number
  totalEtablissements: number
  absencesEnCours: number
}

export type RepartitionParGrade = {
  grade: string
  label: string
  count: number
  fill: string
}

export type RepartitionParRegion = {
  region: string
  professeurs: number
  maitreConferences: number
  chargesCours: number
  assistants: number
}

export type RepartitionParEtablissement = {
  etablissement: string
  professeurs: number
  maitreConferences: number
  chargesCours: number
  assistants: number
}

type GradeKey = keyof typeof GRADE_CHART_COLORS

const CLE_PAR_GRADE: Record<string, GradeKey> = {
  PROFESSEUR: 'professeurs',
  MAITRE_DE_CONFERENCES: 'maitreConferences',
  CHARGE_DE_COURS: 'chargesCours',
  ASSISTANT: 'assistants',
}

export function ligneGradeVide(): Record<GradeKey, number> {
  return {
    professeurs: 0,
    maitreConferences: 0,
    chargesCours: 0,
    assistants: 0,
  }
}

export function incrementerGrade(
  ligne: Record<GradeKey, number>,
  grade: string
): Record<GradeKey, number> {
  const cle = CLE_PAR_GRADE[grade]
  if (!cle) return ligne
  return { ...ligne, [cle]: ligne[cle] + 1 }
}

export function construireRepartitionParGrade(
  comptes: { grade: string; _count: number }[]
): RepartitionParGrade[] {
  return ORDRE_GRADE.map((grade) => ({
    grade,
    label: LIBELLES_GRADE[grade] ?? grade,
    count: comptes.find((c) => c.grade === grade)?._count ?? 0,
    fill: GRADE_FILL[grade] ?? GRADE_CHART_COLORS.chargesCours,
  }))
}
