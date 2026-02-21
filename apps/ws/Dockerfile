FROM node:20-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy monorepo manifests first (repo root)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace packages + ws app
COPY packages ./packages
COPY apps/ws ./apps/ws

# Install deps for the whole workspace
RUN pnpm install --frozen-lockfile

# Build only ws
RUN pnpm --filter @bigroom/ws build

# Run ws
WORKDIR /app/apps/ws
ENV NODE_ENV=production
ENV WS_PORT=4001
EXPOSE 4001
CMD ["node", "dist/index.js"]
