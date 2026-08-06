# ==============================================================================
# Multi-stage Enterprise Production Dockerfile for @expert/api
# ==============================================================================

# Stage 1: Build Dependencies & Compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

RUN npm ci
COPY src ./src
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nestjs -G nodejs

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "dist/main.js"]
