# ─────────────────────────────────────────────────────────────
# MyBoke API — multi-stage Docker build
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl dumb-init
WORKDIR /app

# ── Deps ─────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile=false --prod=false

# ── Build ────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
# `prisma` CLI ni devDependency lakini inahitajika wakati wa runtime
# (`prisma migrate deploy` kwenye CMD) — hivyo hatuprune dev deps.
RUN pnpm prisma:generate && pnpm build

# ── Runtime ──────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

RUN addgroup -S myboke && adduser -S myboke -G myboke \
  && mkdir -p /app/storage/exports /app/storage/uploads \
  && chown -R myboke:myboke /app
USER myboke

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
# Migrations zinaendeshwa kabla ya server (§22).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
