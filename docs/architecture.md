# Architecture Documentation

Siva Rudra Foundations Event Management Platform is structured as a high-performance monorepo using npm workspaces and Next.js/NestJS.

## Subdomain Mapping
- **Public Website**: `https://sivarudrafoundation.com` (`apps/public` on Port `3000`)
- **Admin Panel**: `https://admin.sivarudrafoundation.com` (`apps/admin` on Port `3001`)
- **Judges Panel**: `https://judges.sivarudrafoundation.com` (`apps/judges` on Port `3002`)
- **LED Stage Display**: `https://stage.sivarudrafoundation.com` (`apps/stage` on Port `3003`)
- **Contestant Dashboard**: `https://my.sivarudrafoundation.com` (`apps/contestant` on Port `3004`)
- **API backend**: `https://api.sivarudrafoundation.com` (`backend/api` on Port `4000`)

## Backend Stateless Design
To handle high load (~6,000 active concurrent connections) with low latency:
1. **Stateless API**: Authentication credentials are JWT-signed and stored strictly in secure HTTPOnly SameSite cookies. The API maintains no local session state in memory.
2. **PgBouncer Integration**: Connection pooling is handled through PgBouncer. Direct database modifications are barred in favor of Prisma parameterized queries.
3. **Database Mappings**: Standard PostgreSQL indexes on matching fields like `Score(contestant_id, round_id, judge_id)` and `Contestant(mobile, event_id)` avoid complete scans during scoring operations.
