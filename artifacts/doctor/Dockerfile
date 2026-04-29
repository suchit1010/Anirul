# Doctor UI Dockerfile — build with pnpm, serve with nginx
FROM node:22-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
COPY . .
WORKDIR /workspace/artifacts/doctor
RUN pnpm install --frozen-lockfile --offline || pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:1.25-alpine AS runtime
# Copy built static files into nginx html directory under /doctor
RUN mkdir -p /usr/share/nginx/html/doctor
COPY --from=builder /workspace/artifacts/doctor/dist/public/ /usr/share/nginx/html/doctor/
# Simple nginx config to serve at /doctor/
COPY docker/nginx/doctor_nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
