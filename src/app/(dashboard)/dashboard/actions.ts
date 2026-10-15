/**
 * Point d'entrée serveur pour le tableau de bord.
 * Les pages Server Components importent directement `donnees.ts` ;
 * ce fichier expose la même API pour les appels depuis des Client Components
 * ou des tests, avec un format Result cohérent.
 */
'use server'

import { exigerUtilisateur } from '@/lib/auth'
import {
  recupererStatsDashboard,
  recupererRepartitionParGrade,
  recupererRepartitionParRegion,
  recupererRepartitionParEtablissement,
} from './donnees'

type Result<T> = { success: true; data: T } | { success: false; error: string }

async function envelopper<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { success: true, data: await fn() }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function getDashboardStats() {
  await exigerUtilisateur()
  return envelopper(recupererStatsDashboard)
}

export async function getRepartitionParGrade() {
  await exigerUtilisateur()
  return envelopper(recupererRepartitionParGrade)
}

export async function getRepartitionParRegion() {
  await exigerUtilisateur()
  return envelopper(recupererRepartitionParRegion)
}

export async function getRepartitionParEtablissement() {
  await exigerUtilisateur()
  return envelopper(recupererRepartitionParEtablissement)
}
