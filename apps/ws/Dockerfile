FROM node:20-slim
WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ws ./apps/ws

RUN pnpm install --frozen-lockfile

# Important: do NOT run the package build script if it's broken
RUN pnpm --filter @bigroom/ws exec tsup src/index.ts --format esm --dts=false --clean

WORKDIR /app/apps/ws
ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

CMD ["node", "dist/index.js"]
