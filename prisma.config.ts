// Prisma ORM v7 ne charge plus automatiquement le .env comme avant, et
// la connexion à la base ne vit plus dans schema.prisma : tout se
// configure explicitement ici. C'est ce fichier (pas schema.prisma) que
// lisent `prisma migrate`, `prisma studio` et `prisma db seed`.
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
