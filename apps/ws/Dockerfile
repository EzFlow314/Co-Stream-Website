# ---- build stage ----
FROM node:20-slim AS build
WORKDIR /app

# Enable pnpm via corepack (works for monorepos with workspace:* deps)
RUN corepack enable

# Copy workspace manifests first for better caching
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY ws/package.json ws/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/contracts/package.json packages/contracts/package.json

# Install deps
RUN pnpm install --frozen-lockfile

# Copy the rest
COPY . .

# Build only ws (tsup -> dist/)
RUN pnpm --filter @bigroom/ws build

# ---- run stage ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable

# Copy only what we need to run
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY ws/package.json ws/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/ws/dist /app/ws/dist

WORKDIR /app/ws
EXPOSE 8080

CMD ["node", "dist/index.js"]
