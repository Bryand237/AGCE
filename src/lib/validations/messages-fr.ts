import { z, ZodIssueCode, type ZodErrorMap } from 'zod'

/**
 * Messages de zod en français.
 *
 * Par défaut, zod répond en anglais (« Invalid date », « Invalid email », « String must
 * contain at least 1 character(s) »…). Ce fichier remplace ces textes pour tous les schémas.
 * Un message écrit dans le schéma lui-même (`.min(1, 'Le nom est obligatoire')`) reste
 * prioritaire : celui-ci ne sert que lorsqu'aucun message n'a été prévu.
 *
 * Il est chargé par `champs.ts`, que tous les schémas importent : aucun schéma ne peut donc
 * être utilisé sans lui.
 */
export const erreursEnFrancais: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === 'undefined' || issue.received === 'null'
            ? 'Ce champ est obligatoire.'
            : 'Valeur invalide.',
      }
    case ZodIssueCode.invalid_date:
      return { message: 'Date invalide.' }
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Adresse e-mail invalide.' }
      return { message: 'Valeur invalide.' }
    case ZodIssueCode.invalid_enum_value:
      return {
        message: issue.received === '' ? 'Veuillez faire un choix.' : 'Valeur non autorisée.',
      }
    case ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message:
            Number(issue.minimum) <= 1
              ? 'Ce champ est obligatoire.'
              : `Au moins ${issue.minimum} caractères sont attendus.`,
        }
      }
      return { message: ctx.defaultError }
    case ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Au plus ${issue.maximum} caractères sont autorisés.` }
      }
      return { message: ctx.defaultError }
    default:
      return { message: ctx.defaultError }
  }
}

z.setErrorMap(erreursEnFrancais)
