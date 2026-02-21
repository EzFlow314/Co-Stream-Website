FROM node:20-slim

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ws ./apps/ws

RUN pnpm install --frozen-lockfile

# Build ws (tsup uses apps/ws/tsup.config.ts and won't try DTS)
RUN pnpm --filter @bigroom/ws build

WORKDIR /app/apps/ws
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/index.js"]
