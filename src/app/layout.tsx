import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestion de carrière des enseignants',
  description: "Suivi des enseignants, établissements, absences et avancements d'échelon",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  )
}
