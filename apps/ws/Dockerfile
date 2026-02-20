# apps/ws/Dockerfile
FROM node:20-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy monorepo manifests first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ws/package.json apps/ws/package.json
COPY packages ./packages
COPY apps/ws ./apps/ws

# Install deps (monorepo)
RUN pnpm install --frozen-lockfile

# Build only ws
RUN pnpm --filter @bigroom/ws build

# Run ws
WORKDIR /app/apps/ws
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/index.js"]
