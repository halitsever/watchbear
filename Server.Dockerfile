FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/extension/package.json apps/extension/
RUN pnpm install --frozen-lockfile --filter=@watchbear/server

COPY apps/server apps/server
RUN pnpm --filter=@watchbear/server run build

FROM node:22-slim AS runtime
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NODE_ENV=production
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/extension/package.json apps/extension/
RUN pnpm install --frozen-lockfile --prod --filter=@watchbear/server

COPY --from=build /repo/apps/server/dist apps/server/dist

WORKDIR /repo/apps/server
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
