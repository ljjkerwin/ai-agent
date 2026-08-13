FROM node:24-alpine AS base
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com && corepack enable && corepack prepare pnpm@10 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
COPY package*.json pnpm-lock.yaml ./


FROM base AS builder
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build


FROM base AS runner
ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN rm pnpm-lock.yaml
COPY --from=builder /app/dist ./dist


EXPOSE 3000
CMD ["node", "dist/main.js"]
