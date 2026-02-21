FROM node:20-slim

WORKDIR /app
RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml* ./

RUN node -e "console.log(require('./package.json').scripts)"

RUN pnpm install --frozen-lockfile=false

COPY . .

RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["pnpm", "start"]