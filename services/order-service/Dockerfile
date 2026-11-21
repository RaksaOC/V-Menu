# ---- deps: every dependency, needed to compile ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# ---- build: TypeScript -> dist/ ----
FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---- runtime: production deps + compiled JS only ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    SERVICE_NAME=order-service \
    PORT=4103
COPY package*.json ./
# npm is only needed to install; drop it (and its own bundled packages, which Trivy flags)
# from the runtime image. The service runs with plain node.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /app/dist ./dist

# Last, so a new commit does not invalidate the npm ci layer. Served at /version.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

USER node
EXPOSE 4103
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:$PORT/ready || exit 1
CMD ["node", "dist/index.js"]
