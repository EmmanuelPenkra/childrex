FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000 DATA_FILE=/data/rooms.json
WORKDIR /app
RUN corepack enable
RUN mkdir /data && chown node:node /data
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=build /app/dist ./dist
USER node
VOLUME ["/data"]
EXPOSE 3000
CMD ["node","dist/server/apps/server/src/index.js"]
