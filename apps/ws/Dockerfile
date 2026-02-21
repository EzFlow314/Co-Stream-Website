FROM node:20-slim

WORKDIR /app
RUN corepack enable

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy workspace source
COPY packages ./packages
COPY apps/ws ./apps/ws

# Install deps
RUN pnpm install --frozen-lockfile

# Build shared first (and any other packages your ws depends on)
RUN pnpm --filter @bigroom/shared build

# Build ws
RUN pnpm --filter @bigroom/ws build

# Run
WORKDIR /app/apps/ws
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
