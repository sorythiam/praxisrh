# Build context must be the monorepo root (see infra/docker-compose.yml).

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# --ignore-scripts: this layer only has package.json files (no source, no
# tsconfig yet), so the postinstall hook that builds packages/shared would
# fail here with nothing to compile against. The build stage below runs
# that same step explicitly once real source is copied in.
RUN npm ci --ignore-scripts

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=apps/web

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
