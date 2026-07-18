// Charge la grille "Échelonnement Indiciaire du Corps de l'Enseignement
// Supérieur" telle que fournie. L'ordre est recalculé à partir de la
// position dans le tableau (grade par grade) pour ne jamais avoir à
// saisir une séquence à la main.
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

type Palier = {
  grade: 'ASSISTANT' | 'CHARGE_DE_COURS' | 'MAITRE_DE_CONFERENCES' | 'PROFESSEUR'
  voie?: string // embranchement parallèle réel (Assistant uniquement)
  sousCategorie?: string // libellé d'affichage seul (Délégué, Stagiaire...)
  classe?: number
  echelon?: number
  indice: number
}

const grille: Palier[] = [
  // ASSISTANTS — sans thèse (échelle parallèle et exclusive de "avec thèse")
  { grade: 'ASSISTANT', voie: 'SANS_THESE', echelon: 1, indice: 465 },
  { grade: 'ASSISTANT', voie: 'SANS_THESE', echelon: 2, indice: 530 },
  { grade: 'ASSISTANT', voie: 'SANS_THESE', echelon: 3, indice: 605 },
  // ASSISTANTS — avec thèse
  { grade: 'ASSISTANT', voie: 'AVEC_THESE', echelon: 1, indice: 605 },
  { grade: 'ASSISTANT', voie: 'AVEC_THESE', echelon: 2, indice: 665 },
  { grade: 'ASSISTANT', voie: 'AVEC_THESE', echelon: 3, indice: 715 },

  // CHARGÉS DE COURS
  { grade: 'CHARGE_DE_COURS', sousCategorie: 'DELEGUE', indice: 605 },
  { grade: 'CHARGE_DE_COURS', sousCategorie: 'STAGIAIRE', indice: 665 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 1, indice: 715 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 2, indice: 785 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 3, indice: 870 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 4, indice: 940 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 5, indice: 1005 },
  { grade: 'CHARGE_DE_COURS', classe: 2, echelon: 6, indice: 1050 },
  { grade: 'CHARGE_DE_COURS', classe: 1, echelon: 1, indice: 1115 },
  { grade: 'CHARGE_DE_COURS', classe: 1, echelon: 2, indice: 1140 },
  { grade: 'CHARGE_DE_COURS', classe: 1, echelon: 3, indice: 1200 },
  { grade: 'CHARGE_DE_COURS', sousCategorie: 'CLASSE_EXCEPTIONNELLE', indice: 1240 },

  // MAÎTRES DE CONFÉRENCES
  { grade: 'MAITRE_DE_CONFERENCES', sousCategorie: 'STAGIAIRE', indice: 715 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 1, indice: 785 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 2, indice: 870 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 3, indice: 940 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 4, indice: 1005 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 5, indice: 1050 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 2, echelon: 6, indice: 1115 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 1, echelon: 1, indice: 1140 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 1, echelon: 2, indice: 1200 },
  { grade: 'MAITRE_DE_CONFERENCES', classe: 1, echelon: 3, indice: 1240 },
  { grade: 'MAITRE_DE_CONFERENCES', sousCategorie: 'CLASSE_EXCEPTIONNELLE', indice: 1300 },

  // PROFESSEURS
  { grade: 'PROFESSEUR', classe: 2, echelon: 1, indice: 940 },
  { grade: 'PROFESSEUR', classe: 2, echelon: 2, indice: 1005 },
  { grade: 'PROFESSEUR', classe: 2, echelon: 3, indice: 1050 },
  { grade: 'PROFESSEUR', classe: 2, echelon: 4, indice: 1115 },
  { grade: 'PROFESSEUR', classe: 2, echelon: 5, indice: 1140 },
  { grade: 'PROFESSEUR', classe: 1, echelon: 1, indice: 1200 },
  { grade: 'PROFESSEUR', classe: 1, echelon: 2, indice: 1240 },
  { grade: 'PROFESSEUR', classe: 1, echelon: 3, indice: 1300 },
  { grade: 'PROFESSEUR', sousCategorie: 'CLASSE_EXCEPTIONNELLE', indice: 1350 },
  { grade: 'PROFESSEUR', sousCategorie: 'HORS_ECHELLE', indice: 1400 },
]

// Découpage administratif du Cameroun (10 régions, 58 départements),
// source : "Subdivision territoriale du Cameroun", Wikipédia. Géographie
// fixe — sert à `departementOrigine`/`regionOrigine` de l'enseignant,
// sans rapport avec `Departement` (académique) défini plus haut.
const departementsOrigineParRegion: Record<string, string[]> = {
  Adamaoua: ['Djérem', 'Faro-et-Déo', 'Mayo-Banyo', 'Mbéré', 'Vina'],
  Centre: [
    'Haute-Sanaga',
    'Lekié',
    'Mbam-et-Inoubou',
    'Mbam-et-Kim',
    'Méfou-et-Afamba',
    'Méfou-et-Akono',
    'Mfoundi',
    'Nyong-et-Kellé',
    'Nyong-et-Mfoumou',
    "Nyong-et-So'o",
  ],
  Est: ['Boumba-et-Ngoko', 'Haut-Nyong', 'Kadey', 'Lom-et-Djérem'],
  'Extrême-Nord': [
    'Diamaré',
    'Logone-et-Chari',
    'Mayo-Danay',
    'Mayo-Kani',
    'Mayo-Sava',
    'Mayo-Tsanaga',
  ],
  Littoral: ['Moungo', 'Nkam', 'Sanaga-Maritime', 'Wouri'],
  Nord: ['Bénoué', 'Faro', 'Mayo-Louti', 'Mayo-Rey'],
  'Nord-Ouest': ['Boyo', 'Bui', 'Donga-Mantung', 'Menchum', 'Mezam', 'Momo', 'Ngo-Ketunjia'],
  Ouest: ['Bamboutos', 'Haut-Nkam', 'Hauts-Plateaux', 'Koung-Khi', 'Menoua', 'Mifi', 'Ndé', 'Noun'],
  Sud: ['Dja-et-Lobo', 'Mvila', 'Océan', 'Vallée-du-Ntem'],
  'Sud-Ouest': ['Fako', 'Koupé-Manengouba', 'Lebialem', 'Manyu', 'Meme', 'Ndian'],
}

async function main() {
  const compteurs: Record<string, number> = {}
  for (const palier of grille) {
    compteurs[palier.grade] = (compteurs[palier.grade] ?? 0) + 1
    await prisma.echelonIndiciaire.create({
      data: { ...palier, ordre: compteurs[palier.grade] || 1 },
    })
  }
  console.log(`Grille indiciaire chargée : ${grille.length} paliers.`)

  let totalDepartementsOrigine = 0
  for (const [region, departements] of Object.entries(departementsOrigineParRegion)) {
    const { id: regionId } = await prisma.region.upsert({
      where: { nom: region },
      update: {},
      create: { nom: region },
    })
    for (const nom of departements) {
      await prisma.departementOrigine.upsert({
        where: { nom },
        update: { regionId },
        create: { nom, regionId },
      })
      totalDepartementsOrigine++
    }
  }

  const nomUtilisateur = process.env.ADMIN_USERNAME
  const motDePasse = process.env.ADMIN_PASSWORD
  if (!nomUtilisateur || !motDePasse) {
    throw new Error(
      'ADMIN_USERNAME et ADMIN_PASSWORD doivent être définis dans .env avant le seed.'
    )
  }
  await prisma.utilisateur.upsert({
    where: { nomUtilisateur },
    update: {},
    create: { nomUtilisateur, motDePasseHash: await bcrypt.hash(motDePasse, 12) },
  })
  console.log(
    `Géographie administrative chargée : ${Object.keys(departementsOrigineParRegion).length} régions, ${totalDepartementsOrigine} départements.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
