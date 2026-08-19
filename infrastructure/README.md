# Infrastructure Architecture & Scaling Target

This directory hosts deployment scripts, server proxies, and environment definitions for Siva Rudra Foundations.

## 6,000 Concurrent User Scaling Design

To reliably handle 6,000 active concurrent connections (e.g. judges submitting scores, contestants tracking positions, and public users reviewing event leaderboards) without server lag:

### 1. Reverse Proxy (Nginx / Cloudflare)
- Use **Nginx** at the edge to load balance requests and route subdomains:
  - `https://sivarudrafoundation.com` -> `apps/public` (Port `3000`)
  - `https://admin.sivarudrafoundation.com` -> `apps/admin` (Port `3001`)
  - `https://judges.sivarudrafoundation.com` -> `apps/judges` (Port `3002`)
  - `https://stage.sivarudrafoundation.com` -> `apps/stage` (Port `3003`)
  - `https://my.sivarudrafoundation.com` -> `apps/contestant` (Port `3004`)
  - `https://api.sivarudrafoundation.com` -> `backend/api` (Port `4000`)
- Enforce strict Gzip/Brotli compression, SSL offloading, and cache-control headers on static assets.

### 2. High-Performance WebSockets (Socket.IO with Redis Adapter)
- Real-time leaderboard updates push to screens (`apps/stage` & `apps/contestant`) over Socket.IO.
- Node.js single-thread limits socket capacity. Scale backend horizontally by running multiple API containers behind the load balancer.
- Integrate a **Redis Pub/Sub adapter** (`@socket.io/redis-adapter`) to sync sockets across cluster nodes.

### 3. Database Connection Pooling (PgBouncer)
- 6,000 users query databases simultaneously. Prisma's native pool can exceed PostgreSQL connections limits.
- Deploy **PgBouncer** in session/transaction mode to multiplex connections efficiently.
- Set query indexing on `Score(contestantId, roundId)` and `Registration(eventId, categoryId)` to avoid table scans during score compilations.

### 4. Boilerplate Config Drafts
In future phases, we will populate this folder with:
- `docker-compose.yml` for multi-stage PostgreSQL, Redis, PgBouncer, and NestJS containers.
- `nginx.conf` reverse proxy setup.
