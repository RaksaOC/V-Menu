# ---- deps ----
FROM node:26-slim AS deps
WORKDIR /app
COPY package*.json .npmrc* ./
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

# Configure microservice URLs
ARG RESTAURANT_SERVICE_URL=http://restaurant-service:4101
ENV RESTAURANT_SERVICE_URL=$RESTAURANT_SERVICE_URL
ARG MENU_SERVICE_URL=http://menu-service:4102
ENV MENU_SERVICE_URL=$MENU_SERVICE_URL
ARG ORDER_SERVICE_URL=http://order-service:4103
ENV ORDER_SERVICE_URL=$ORDER_SERVICE_URL

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
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
# node:*-slim has no wget or curl, so the check uses Node's own fetch. 127.0.0.1, not
# localhost: the server listens on IPv4 (0.0.0.0) and localhost may resolve to ::1.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
