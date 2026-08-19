# Load Testing & Capacity Planning Plan

This document outlines the synthetic load testing protocol for the **Siva Rudra Foundation** platform before opening live event operations.

---

## 1. Target Capacity & Concurrency Objectives

| User Persona / Surface | Target Concurrent Users | Peak Request Rate | Primary Actions |
| :--- | :--- | :--- | :--- |
| **Public Website Viewers** | 6,000 Concurrent Users | 500 req/sec | Event discovery, category view, certified leaderboard browsing |
| **Public Registration Traffic** | 500 Concurrent Submissions | 50 req/sec | OTP requests, contestant registration submissions |
| **Live Stage Display** | 100 Stage Receivers | Persistent WSS | WebSocket connection stream, live score updates |
| **Judges & Evaluators** | 20 Concurrent Judges | 10 req/sec | Real-time score entry, criteria adjustments, locking |
| **Admin Operators** | 5 Concurrent Admins | 5 req/sec | Live score audits, score unlocking, result publishing |

---

## 2. Performance Budgets (SLIs & SLOs)

- **API Response Latency (Read Endpoints)**:
  - $p50 < 80\text{ ms}$
  - $p95 < 250\text{ ms}$
  - $p99 < 600\text{ ms}$
- **Score Mutation Latency (ACID Write Endpoints)**:
  - $p95 < 300\text{ ms}$
- **Realtime WebSocket Propagation Latency**:
  - Score committed to DB $\rightarrow$ Broadcast received by Stage Display $< 200\text{ ms}$.
- **HTTP Error Rate**:
  - $< 0.01\%$ (Non-4xx errors).
- **Database Connection Pool Saturation**:
  - $< 75\%$ pooler capacity at peak load.

---

## 3. Test Scenarios & Execution Phases

### Phase 1: Baseline Read Load (k6 / Artillery)
- **Ramp-Up**: 0 to 2,000 virtual users over 5 minutes.
- **Steady State**: 2,000 virtual users querying `/public/events`, `/public/events/:slug/results`, `/public/events/:slug/winners`.
- **Validation**: Verify Cloudflare edge cache hit ratio and database CPU utilization $< 20\%$.

### Phase 2: Registration Burst Spike
- **Spike**: 0 to 500 concurrent registration requests within 30 seconds.
- **Validation**: Idempotent phone number handling, OTP rate limit enforcement, database connection pool stability.

### Phase 3: Live Pageant Simulation (WebSocket Stress)
- **Setup**: 1,000 simulated WebSocket clients joined to `stage:{eventId}` and `admin:{eventId}` rooms.
- **Action**: 20 virtual judges submitting concurrent scores every 3 seconds for 15 minutes.
- **Validation**: Zero message loss, Redis Pub/Sub message distribution latency $< 150\text{ ms}$, zero memory leaks on backend gateway.

### Phase 4: Stress to Failure & Soak Test
- **Ramp**: 6,000 virtual users held for 1 hour.
- **Monitoring**: Memory footprint stability (detect GC pauses or buffer accumulation), connection pool exhaustion recovery.
