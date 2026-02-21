FROM node:22-slim

WORKDIR /app

RUN corepack enable

# Copy entire repo
COPY . .

# Install workspace
RUN pnpm install --frozen-lockfile

# Build shared + ws (dependency-aware)
RUN pnpm --filter @bigroom/ws... build

EXPOSE 8080

CMD ["node", "apps/ws/dist/index.js"]