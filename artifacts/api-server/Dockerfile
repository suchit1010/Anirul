# API Server Dockerfile — multi-stage
FROM node:22-alpine AS builder
WORKDIR /workspace
# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
# Copy workspace packages needed for API
COPY . .
WORKDIR /workspace/artifacts/api-server
RUN pnpm install --frozen-lockfile --offline || pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Copy built output
COPY --from=builder /workspace/artifacts/api-server/dist ./dist
# Copy package.json to allow tooling if needed
COPY artifacts/api-server/package.json ./package.json
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
