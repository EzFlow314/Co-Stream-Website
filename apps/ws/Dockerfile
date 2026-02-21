FROM node:20-slim

WORKDIR /app
RUN corepack enable

# Copy only WS package files first (better caching)
COPY package.json ./
COPY pnpm-lock.yaml* ./

# Install deps
RUN pnpm install --frozen-lockfile=false

# Copy the rest of the WS app
COPY . .

# Build TypeScript (tsup)
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 8080

# Run compiled server (adjust if your output path differs)
CMD ["node", "dist/index.js"]