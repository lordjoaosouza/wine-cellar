# Build context is the repository root (see docker-compose.yml) so pnpm can resolve the workspace.
FROM node:22-alpine AS base
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile --filter server...
COPY server ./server
RUN DATABASE_URL=postgresql://build@localhost/build pnpm --filter server run prisma:generate
RUN pnpm --filter server run build

FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile --prod --filter server...
COPY --from=build /repo/server/dist ./server/dist
COPY server/prompts ./server/prompts
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts server/docker-entrypoint.sh ./server/
WORKDIR /repo/server
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
