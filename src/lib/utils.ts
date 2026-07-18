import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Point d'entrée unique pour toutes les classes conditionnelles de
// l'appli. clsx gère les conditions, tailwind-merge résout les
// conflits entre classes Tailwind (ex: un className="px-8" passé en
// prop qui doit gagner contre le "px-4" par défaut du composant).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
