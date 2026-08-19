# Production Deployment & Operations Guide

This guide details the step-by-step procedure for deploying the **Siva Rudra Foundation** platform across server and serverless environments.

---

## 1. Hosting Architecture Overview

```
                          [ Internet / Users ]
                                   │
                     [ Cloudflare Edge CDN & WAF ]
                                   │
      ┌────────────────┬───────────┴───────────┬────────────────┐
      │                │                       │                │
[ Vercel / Pages ] [ Vercel / Pages ]    [ Vercel / Pages ] [ Container / VM ]
  • Public Web      • Admin Panel         • Stage Display     • NestJS API
  • Contestant      • Judge Console                           • Socket.IO
                                                                │
                                              ┌─────────────────┴─────────────────┐
                                              │                                   │
                                      [ Supabase PG ]                      [ Redis Cluster ]
                                      • PostgreSQL 15                      • Pub/Sub Realtime
                                      • Pooled Queries
```

---

## 2. Pre-Deployment Checklist

- [ ] All 92 automated tests pass (`npm run test --workspace=@srf/api`).
- [ ] TypeScript check clean (`npm run typecheck`).
- [ ] Code formatting and linting clean (`npm run lint`).
- [ ] Production `.env` secrets configured in secrets manager (e.g. AWS Secrets Manager, Doppler, or Vercel Environment Variables).
- [ ] Database migrations applied using `DIRECT_URL`.

---

## 3. Database Migration Deployment

Before starting or updating the API service, apply pending schema migrations:

```bash
# In CI/CD deployment runner:
cd database
npx prisma migrate deploy
```

> [!NOTE]
> `prisma migrate deploy` applies all verified migrations in `database/prisma/migrations/` sequentially against the target production database without modifying the schema interactively.

---

## 4. API Deployment (Docker / VPS / Cloud Provider)

### Build and Run with Docker:
```bash
# Build multi-stage image
docker build -t srf-api:latest -f backend/api/Dockerfile .

# Run container with production environment variables
docker run -d \
  --name srf-api \
  --restart always \
  -p 4000:4000 \
  --env-file .env.production \
  srf-api:latest
```

### Health Check Verification:
```bash
curl -I https://api.sivarudrafoundation.com/health
# Expected: HTTP 200 OK
```

---

## 5. Next.js Frontend Deployments

For each Next.js application (`apps/public`, `apps/admin`, `apps/judges`, `apps/stage`, `apps/contestant`):

1. **Build Step**:
   ```bash
   npm run build --workspace=@srf/public
   ```
2. **Environment Variables**:
   Set `NEXT_PUBLIC_API_URL=https://api.sivarudrafoundation.com` and `NEXT_PUBLIC_WS_URL=wss://api.sivarudrafoundation.com`.

---

## 6. Rollback Strategy

1. **Database Backward Compatibility**:
   - Database migrations must follow the **Expand and Contract** pattern (additive changes first). Never drop columns or tables in the same deployment as new code.
2. **Container Rollback**:
   - If a new API build exhibits critical runtime errors, immediately revert the container tag to the previous stable release:
     ```bash
     docker stop srf-api && docker rm srf-api
     docker run -d --name srf-api -p 4000:4000 --env-file .env.production srf-api:v-previous
     ```
3. **Frontend Rollback**:
   - Use instant deployment rollbacks (e.g. Vercel / Cloudflare Pages instant rollback to previous commit sha).
