# Built from the repo root (CL-05), so the API types in backend/packages/contracts are in reach:
#   docker build -f frontend/Dockerfile .
# frontend/Dockerfile.dockerignore keeps the context to frontend/ and the contracts' source.

# ---- deps ----
FROM node:26-slim AS deps
WORKDIR /app
COPY frontend/package*.json frontend/.npmrc* ./
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM node:26-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are baked into the browser bundle, so they are build args
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
# B6: e2e builds only (CI's compose stack). Release builds leave both empty: real Firebase.
ARG NEXT_PUBLIC_E2E
ENV NEXT_PUBLIC_E2E=$NEXT_PUBLIC_E2E
ARG NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL
ENV NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=$NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL
# SEC-02: report-only (default) or enforce for the Content-Security-Policy
ARG CSP_MODE=report-only
ENV CSP_MODE=$CSP_MODE
# PHOTOS-S3: object storage's public address (https://files.example.com). The CSP lets the
# browser post photos to it and load them from it. Empty: not in the CSP.
ARG S3_PUBLIC_URL=
ENV S3_PUBLIC_URL=$S3_PUBLIC_URL

# Configure microservice URLs
ARG RESTAURANT_SERVICE_URL=http://restaurant-service:4101
ENV RESTAURANT_SERVICE_URL=$RESTAURANT_SERVICE_URL
ARG MENU_SERVICE_URL=http://menu-service:4102
ENV MENU_SERVICE_URL=$MENU_SERVICE_URL
ARG ORDER_SERVICE_URL=http://order-service:4103
ENV ORDER_SERVICE_URL=$ORDER_SERVICE_URL

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
# tsconfig maps @vmenu/contracts here (../backend from /app). Types only, except money.ts (CL-07), which imports nothing
COPY backend/packages/contracts/src /backend/packages/contracts/src
RUN mkdir -p public && npm run build

# ---- run: Next.js standalone server only ----
FROM node:26-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3400 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=192
    
# Debian security fixes newer than the base image (Trivy fails the release on fixable HIGHs),
# and no npm: server.js runs with plain node, and npm's bundled packages get flagged.
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Last, so a new commit does not invalidate the layers above. Which build is running.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

USER node
EXPOSE 3400
# Cheap check: bash opens a socket and sends HEAD /favicon.ico (a static file), so no Node process
# starts and no page is rendered. The old `node -e fetch('/')` check cost ~0.9 CPU-seconds per run.
# Every 3 s while starting (so deploys and CI see "healthy" quickly), then every 30 s.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --start-interval=3s --retries=3 \
    CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/${PORT:-3400} && printf 'HEAD /favicon.ico HTTP/1.0\\r\\n\\r\\n' >&3 && read -r status <&3 && [[ $status == *' 200 '* ]]"]
CMD ["node", "server.js"]
