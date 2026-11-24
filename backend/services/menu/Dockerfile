# Built with backend/ as the context, so the shared @vmenu/common package can be copied in:
#   docker build -f backend/services/menu/Dockerfile backend
# Only packages/common and this service are installed and compiled; the other services'
# package.json files are copied because npm ci checks every workspace against the lockfile.

# ---- deps: every dependency, needed to compile ----
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/common/package.json packages/common/
COPY packages/contracts/package.json packages/contracts/
COPY services/restaurant/package.json services/restaurant/
COPY services/menu/package.json services/menu/
COPY services/order/package.json services/order/
RUN npm ci -w services/menu --no-audit --no-fund

# ---- build: TypeScript -> dist/ (common first, through the service's prebuild script) ----
FROM deps AS build
COPY packages/contracts/tsconfig*.json packages/contracts/
COPY packages/contracts/src packages/contracts/src
COPY packages/common/tsconfig*.json packages/common/
COPY packages/common/src packages/common/src
COPY services/menu/tsconfig*.json services/menu/
COPY services/menu/src services/menu/src
RUN npm run build -w services/menu

# ---- runtime: production deps + compiled JS only ----
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    SERVICE_NAME=menu-service \
    PORT=4102
COPY package.json package-lock.json ./
COPY packages/common/package.json packages/common/
COPY packages/contracts/package.json packages/contracts/
COPY services/restaurant/package.json services/restaurant/
COPY services/menu/package.json services/menu/
COPY services/order/package.json services/order/
# npm is only needed to install; drop it (and its own bundled packages, which Trivy flags)
# from the runtime image. The service runs with plain node.
RUN npm ci --omit=dev -w services/menu --no-audit --no-fund && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /app/packages/common/dist ./packages/common/dist
COPY --from=build --chown=node:node /app/services/menu/dist ./services/menu/dist

# Last, so a new commit does not invalidate the npm ci layer. Served at /version.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

USER node
# The service's own folder, so `node dist/index.js` and `node dist/seed.js` work as before.
WORKDIR /app/services/menu
EXPOSE 4102
# Every 3 s while starting, then every 30 s (each check is a process the Docker engine starts).
# Up to 3 minutes to start: the shared server can need over a minute to boot Node.
HEALTHCHECK --interval=30s --timeout=3s --start-period=180s --start-interval=3s --retries=3 \
    CMD wget -qO- http://localhost:$PORT/ready || exit 1
CMD ["node", "dist/index.js"]
