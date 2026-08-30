ARG NODE_IMAGE=node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436
ARG AUBE_VERSION=2.2.0

FROM ${NODE_IMAGE} AS package-manager

ARG AUBE_VERSION

ENV AUBE_CACHE_DIR=/var/cache/aube/cache \
    AUBE_NO_UPDATE_CHECK=true \
    AUBE_STORE_DIR=/var/cache/aube/store \
    CI=true

RUN --mount=type=cache,id=holocomm-npm,target=/root/.npm,sharing=locked \
    npm install --global --ignore-scripts=false "@endevco/aube@${AUBE_VERSION}"

WORKDIR /app

FROM package-manager AS base-deps

COPY --link package.json aube-lock.yaml aube-workspace.yaml ./
COPY --link apps/backend/package.json ./apps/backend/package.json
COPY --link apps/frontend/package.json ./apps/frontend/package.json
COPY --link packages/design-tokens/package.json ./packages/design-tokens/package.json
COPY --link packages/protocol/package.json ./packages/protocol/package.json

FROM base-deps AS dev-deps

RUN --mount=type=cache,id=holocomm-aube,target=/var/cache/aube,sharing=locked \
    aube --disable-global-virtual-store install --frozen-lockfile

FROM base-deps AS prod-deps

RUN --mount=type=cache,id=holocomm-aube,target=/var/cache/aube,sharing=locked \
    aube --disable-global-virtual-store --filter-prod @holocomm/backend... \
    install --frozen-lockfile --prod

FROM ${NODE_IMAGE} AS frontend-build

WORKDIR /workspace

RUN --mount=type=bind,source=.,target=/workspace,rw \
    --mount=type=bind,from=dev-deps,source=/app/node_modules,target=/workspace/node_modules,rw \
    --mount=type=bind,from=dev-deps,source=/app/apps/frontend/node_modules,target=/workspace/apps/frontend/node_modules,rw \
    --mount=type=bind,from=dev-deps,source=/app/packages/design-tokens/node_modules,target=/workspace/packages/design-tokens/node_modules,rw \
    --mount=type=bind,from=dev-deps,source=/app/packages/protocol/node_modules,target=/workspace/packages/protocol/node_modules,rw \
    ./apps/frontend/node_modules/.bin/vue-tsc -b apps/frontend/tsconfig.json \
    && ./apps/frontend/node_modules/.bin/vite build apps/frontend --outDir /dist --emptyOutDir

FROM ${NODE_IMAGE} AS backend-build

WORKDIR /dist

RUN --mount=type=bind,source=.,target=/source \
    mkdir -p apps/backend packages/protocol \
    && cp /source/package.json package.json \
    && cp /source/apps/backend/package.json apps/backend/package.json \
    && cp -R /source/apps/backend/src apps/backend/src \
    && cp /source/packages/protocol/package.json packages/protocol/package.json \
    && cp -R /source/packages/protocol/src packages/protocol/src

FROM ${NODE_IMAGE} AS runtime

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000 \
    STATIC_FILES_PATH=/app/public

WORKDIR /app

COPY --link --from=prod-deps /app/node_modules ./node_modules
COPY --link --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --link --from=prod-deps /app/packages/protocol/node_modules ./packages/protocol/node_modules
COPY --link --from=backend-build /dist ./
COPY --link --from=frontend-build /dist ./public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider -T 3 "http://127.0.0.1:${PORT}/health"

CMD ["node", "apps/backend/src/infra/node/bootstrap.ts"]
