# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files first
COPY package.json pnpm-workspace.yaml ./
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Install deps (workspace-aware)
RUN pnpm install --frozen-lockfile

# Build only ws package
RUN pnpm --filter @bigroom/ws build

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Install pnpm for runtime install
RUN npm install -g pnpm

COPY --from=builder /app ./

EXPOSE 4001

CMD ["pnpm", "--filter", "@bigroom/ws", "start"]
