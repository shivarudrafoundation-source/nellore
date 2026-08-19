# Production Environment Configuration & Architecture

This document catalogs the environment variable matrix, database connection strategy, Redis Pub/Sub topology, and cookie domain isolation for the **Siva Rudra Foundation** production platform.

---

## 1. Environment Variable Catalog

### Backend API (`@srf/api`)
| Variable | Required | Production Value / Description | Sensitivity |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Low |
| `PORT` | Yes | `4000` | Low |
| `DATABASE_URL` | Yes | Supabase Transaction Pooler URL (Port 6543 / 5432 with `?pgbouncer=true`) | **High (Secret)** |
| `DIRECT_URL` | Yes | Supabase Direct Connection URL (Port 5432) | **High (Secret)** |
| `REDIS_URL` | Yes | Upstash / Managed Redis connection URL (`rediss://...`) | **High (Secret)** |
| `JWT_SECRET` | Yes | Cryptographic HMAC secret for Access Tokens ($\ge 32$ chars) | **Critical (Secret)** |
| `JWT_REFRESH_SECRET` | Yes | Distinct HMAC secret for Refresh Tokens ($\ge 32$ chars) | **Critical (Secret)** |
| `TOTP_ENCRYPTION_KEY` | Yes | 32-byte encryption key for 2FA secrets | **Critical (Secret)** |
| `COOKIE_DOMAIN` | Optional | `.sivarudrafoundation.com` or empty for host-only | Medium |
| `SUPABASE_URL` | Yes | `https://[PROJECT-REF].supabase.co` | Medium |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side only Supabase service role key | **Critical (Secret)** |

### Frontend Applications (`@srf/public`, `@srf/admin`, `@srf/judges`, `@srf/stage`, `@srf/contestant`)
| Variable | Application | Target Production Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | All frontends | `https://api.sivarudrafoundation.com` |
| `NEXT_PUBLIC_WS_URL` | Admin, Judges, Stage | `wss://api.sivarudrafoundation.com` |

---

## 2. Cookie Domain & Authentication Isolation Strategy

Authentication tokens are delivered exclusively in **HTTPOnly, Secure, SameSite=Lax** cookies:
- `access_token` (Expires in 15 minutes)
- `refresh_token` (Expires in 7 days)

### Scoping Rules:
1. **Subdomain Architecture**:
   - Because the frontends live on distinct subdomains (`admin.sivarudrafoundation.com`, `judges.sivarudrafoundation.com`, `my.sivarudrafoundation.com`) and make cross-subdomain API calls with credentials (`credentials: 'include'`) to `api.sivarudrafoundation.com`:
   - **Option A (Shared Parent Domain)**: Setting `COOKIE_DOMAIN=.sivarudrafoundation.com` allows cookies to be sent across all subdomains. Role-based Access Control (RBAC) guards (`RolesGuard`) strictly ensure that an authenticated `CONTESTANT` cannot access `/admin/*` or `/judge/*` routes regardless of cookie visibility.
   - **Option B (Host-Only Domain with API Proxy / Reverse Proxy)**: Setting `COOKIE_DOMAIN=""` (host-only) keeps cookies isolated to the exact host. When using Cloudflare or Nginx reverse proxy routes (`/api/*`), host-only cookies remain fully isolated per application.

---

## 3. Database Connection Strategy (Supabase PostgreSQL)

Prisma uses a dual-URL architecture:
1. **`DATABASE_URL` (Runtime Query Pooling)**:
   - Uses Supabase Supavisor connection pooler in transaction mode.
   - Sizing: `connection_limit=20` to `connection_limit=50` per backend instance to prevent database connection exhaustion under high traffic.
2. **`DIRECT_URL` (Migrations & Schema Changes)**:
   - Direct connection to PostgreSQL port 5432.
   - Used only by `npx prisma migrate deploy` in CI/CD build scripts.

---

## 4. Redis Pub/Sub Architecture & Failure Handling

1. **Usage**:
   - Redis is used strictly for **multi-instance realtime event broadcasting** (`SCORE_SUBMITTED`, `SCORE_UPDATED`, `SCORE_LOCKED`).
2. **Resilience & Graceful Degradation**:
   - If Redis becomes temporarily unreachable, `RedisPubSubService` logs a warning and falls back immediately to local in-process `EventEmitter`.
   - **Critical Principle**: Scores and evaluations are saved to PostgreSQL **first** inside ACID database transactions. Realtime event delivery is purely post-commit. A Redis outage will never cause data loss or prevent judges/admins from saving scores.
