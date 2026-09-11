# syntax=docker/dockerfile:1

# ─── build ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Install deps against the lockfile only (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the static PWA bundle → /app/dist
COPY . .
RUN npm run build

# ─── serve ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# SPA fallback + cache headers (see docs/DEPLOYMENT.md §Headers)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Fail the container if the config is bad; nginx:alpine's own CMD then runs.
RUN nginx -t

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
