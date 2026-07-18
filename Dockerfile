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
# Alpine n'est pas supporté par Playwright : Chromium + ses dépendances
# système (polices, libs graphiques) doivent être installés ici.
RUN npx playwright install --with-deps chromium

# --- Étape 3 : exécution ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /root/.cache/ms-playwright /home/nextjs/.cache/ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/home/nextjs/.cache/ms-playwright

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]