FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4321

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY . .

RUN mkdir -p /data

EXPOSE 4321

CMD ["node", "--no-warnings", "src/server.js"]
