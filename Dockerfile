# --- Étape 1 : dépendances ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Étape 2 : build ---
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Valeur factice, utilisée UNIQUEMENT pendant le build : "prisma generate"
# n'a pas besoin d'une vraie connexion, mais Prisma 7 (prisma.config.ts)
# exige que DATABASE_URL soit définie, même pour cette commande. La
# vraie valeur, utilisée à l'exécution du conteneur, vient de
# docker-compose.yml (environment: DATABASE_URL) — jamais de cette ligne.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN npx prisma generate
RUN npm run build

# --- Étape 3 : exécution ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Fuseau du service : « aujourd'hui » (période proposée à un nouveau rapport, statut des absences,
# ancienneté) est le jour du calendrier de l'utilisateur. Sans cette ligne, le conteneur est en UTC
# et croit qu'on est encore la veille entre minuit et 1 h, heure de Douala.
ENV TZ=Africa/Douala

# Chromium (PDF des listes et des rapports) : installé DANS cette étape finale, avec ses
# bibliothèques système et des polices qui rendent les accents. Un « playwright install --with-deps »
# fait dans l'étape de build n'installerait ces bibliothèques que là, pas ici (audit C2).
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
# Variable lue par src/lib/pdf/genererPdf.ts.
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Gabarits Word des décisions et attestations : lus au moment de la génération, le traçage
# automatique de Next.js ne les inclut pas de façon fiable (audit C5).
COPY --from=builder --chown=nextjs:nodejs /app/templates ./templates

# Images téléversées (photos, logos) : dans l'image, public/ est figé à la construction et
# n'appartient pas à l'utilisateur de l'application. Elles vont donc dans un dossier à part, qui
# lui appartient, désigné par UPLOADS_DIR (audit C4). Le volume « uploads » de docker-compose.yml
# s'y monte ; les photos livrées avec le dépôt (public/uploads) restent lues sur place.
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data
ENV UPLOADS_DIR=/app/data/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]