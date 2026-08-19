# =========================================================
# Multi-stage Production Dockerfile for Siva Rudra NestJS API
# =========================================================

# Stage 1: Build & Prune
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools if needed
RUN apk add --no-cache libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY backend/api/package.json ./backend/api/
COPY database/package.json ./database/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/

# Install full dependencies across workspace
RUN npm ci

# Copy source files
COPY backend/api ./backend/api
COPY database ./database
COPY packages/types ./packages/types
COPY packages/validation ./packages/validation
COPY packages/config ./packages/config

# Generate Prisma Client
RUN npx prisma generate --schema=./database/prisma/schema.prisma

# Build TypeScript workspaces
RUN npm run build --workspace=@srf/types
RUN npm run build --workspace=@srf/validation
RUN npm run build --workspace=@srf/config
RUN npm run build --workspace=@srf/api

# ---------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ---------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy root and package manifests for runtime production install
COPY package.json package-lock.json ./
COPY backend/api/package.json ./backend/api/
COPY database/package.json ./database/
COPY packages/types/package.json ./packages/types/
COPY packages/validation/package.json ./packages/validation/
COPY packages/config/package.json ./packages/config/

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema and generate client in runner
COPY --from=builder /app/database/prisma ./database/prisma
RUN npx prisma generate --schema=./database/prisma/schema.prisma

# Copy compiled JavaScript output
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/validation/dist ./packages/validation/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/backend/api/dist ./backend/api/dist

# Set ownership to non-root user
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "backend/api/dist/main.js"]
