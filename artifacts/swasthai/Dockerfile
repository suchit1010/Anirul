# SwasthAI (Expo web) Dockerfile — attempts to build static web assets
# NOTE: The project's `scripts/build.js` requires a deployment domain (REPLIT/EXPO envs)
FROM node:22-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
COPY . .
WORKDIR /workspace/artifacts/swasthai
RUN pnpm install --frozen-lockfile --offline || pnpm install --frozen-lockfile
# BUILD: requires EXPO_PUBLIC_DOMAIN or REPLIT_DEV_DOMAIN env to be set
ARG EXPO_PUBLIC_DOMAIN
ENV EXPO_PUBLIC_DOMAIN=${EXPO_PUBLIC_DOMAIN}
RUN node scripts/build.js

FROM nginx:1.25-alpine AS runtime
RUN mkdir -p /usr/share/nginx/html/
# Build script writes a static-build directory; copy it if present
COPY --from=builder /workspace/artifacts/swasthai/static-build/ /usr/share/nginx/html/
COPY docker/nginx/swasthai_nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
