# Disaster Recovery & Backup Strategy

This document specifies the business continuity, automated backup, point-in-time recovery, and restore protocols for the **Siva Rudra Foundation** platform.

---

## 1. Database Backup & Point-in-Time Recovery (Supabase PostgreSQL)

### Primary Recovery Mechanisms:
1. **Automated Daily Backups**:
   - Supabase automatically captures daily full database snapshots with a retention period matching the project tier (7 to 30 days).
2. **Point-In-Time Recovery (PITR)**:
   - For critical production events, enable Supabase PITR (Continuous WAL archiving) allowing database state restoration to any exact second within the retention window.
3. **Manual Logical Backups (pg_dump)**:
   - Before applying major schema migrations or starting pageant scoring rounds, create a timestamped logical dump:
     ```bash
     pg_dump -h db.[PROJECT-REF].supabase.co -U postgres -d postgres -F c -b -v -f "srf_backup_$(date +%Y%m%d_%H%M%S).dump"
     ```

---

## 2. Media & PDF Storage Backup

1. **Supabase Storage Buckets**:
   - PDF rulebooks, guidelines, and dossiers stored in `srf-documents` bucket.
   - S3-compatible replication or periodic rsync to a secondary backup bucket (e.g. AWS S3 / Cloudflare R2) is recommended before live event opening.

---

## 3. Redis Transient State Recovery

1. **Non-Authoritative Role**:
   - Redis is used exclusively for transient Pub/Sub message distribution.
   - Redis does **not** store persistent contest results or judge scores.
2. **Failure Recovery**:
   - If Redis crashes or restarts, active WebSocket clients reconnect with exponential backoff.
   - Live stage screens immediately query `/public/events/:slug/results` to restore the authoritative state directly from PostgreSQL upon reconnection.

---

## 4. Disaster Recovery Runbook

| Disaster Scenario | Recovery Action | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
| :--- | :--- | :--- | :--- |
| **Accidental Score Deletion / Corruption** | Restore database via Supabase PITR to timestamp immediately preceding corruption. | $< 30\text{ minutes}$ | $< 5\text{ minutes}$ |
| **API Host Crash / Hardware Failure** | Spin up new API container using pre-built Docker image (`srf-api:latest`) with `.env.production`. | $< 5\text{ minutes}$ | $0\text{ minutes}$ (Stateless API) |
| **Redis Service Outage** | Backend automatically falls back to local in-memory event distribution; restart or reconnect Redis. | Immediate fallback | $0\text{ minutes}$ (No persistent data in Redis) |
| **DNS / CDN Outage** | Switch DNS NS records or fallback to direct origin IP via Cloudflare disaster recovery. | $< 15\text{ minutes}$ | $0\text{ minutes}$ |
