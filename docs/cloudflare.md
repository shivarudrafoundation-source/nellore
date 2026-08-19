# Cloudflare Architecture & Production Readiness Guide

This document defines the production network, DNS, edge caching, WAF, and WebSocket configuration for the **Siva Rudra Foundation** platform (`sivarudrafoundation.com`).

---

## 1. Domain & DNS Routing Matrix

| Hostname | Target / Type | Cloudflare Proxy (Orange Cloud) | Purpose |
| :--- | :--- | :--- | :--- |
| `sivarudrafoundation.com` (`@`) | CNAME / A | **Proxied (ON)** | Public Event Discovery & Registration Website |
| `www.sivarudrafoundation.com` | CNAME `sivarudrafoundation.com` | **Proxied (ON)** | Canonical redirect to apex domain |
| `admin.sivarudrafoundation.com` | CNAME / A | **Proxied (ON)** | Admin Orchestration & Scoring Panel |
| `judges.sivarudrafoundation.com` | CNAME / A | **Proxied (ON)** | Real-time Judge Scoring Console |
| `stage.sivarudrafoundation.com` | CNAME / A | **Proxied (ON)** | Live LED Wall Stage Display |
| `my.sivarudrafoundation.com` | CNAME / A | **Proxied (ON)** | Contestant Self-Service Portal |
| `api.sivarudrafoundation.com` | CNAME / A | **Proxied (ON)** | NestJS REST API & Socket.IO WebSocket Gateway |

---

## 2. SSL / TLS Configuration

- **Encryption Mode**: **Full (Strict)** — Requires a valid SSL/TLS certificate installed on the origin server (e.g. Cloudflare Origin CA Certificate or Let's Encrypt).
- **Minimum TLS Version**: **TLS 1.2** (Disable TLS 1.0 and 1.1).
- **Opportunistic Encryption**: Enabled.
- **TLS 1.3**: Enabled (with 0-RTT connection resumption).
- **Automatic HTTPS Rewrites**: Enabled.
- **Always Use HTTPS**: Enabled at the Cloudflare Edge.

---

## 3. WebSocket (WSS) Configuration for Real-time Scoring

The live scoring distribution uses Socket.IO over WebSocket under the path `/realtime/`.

### Requirements:
1. **WebSockets Feature**: Enable in Cloudflare Dashboard under **Network $\rightarrow$ WebSockets: ON**.
2. **Session Affinity (Sticky Sessions)**:
   - When running multiple NestJS API instances behind a load balancer, configure Session Affinity or rely on Redis adapter for multi-instance socket message broadcasting.
3. **WSS Endpoint**:
   - `wss://api.sivarudrafoundation.com/realtime`
4. **Cache Bypass Rule**:
   - WebSocket upgrade requests (`Upgrade: websocket`) must **never** be cached.
   - Cloudflare automatically bypasses caching for WebSocket upgrade handshakes when WebSockets are enabled.

---

## 4. Edge Caching & Page Rules

### Cache Everything (Static Assets & Public Data)
- `sivarudrafoundation.com/_next/static/*` $\rightarrow$ **Edge Cache TTL**: 1 Month, **Browser Cache TTL**: 1 Month.
- `sivarudrafoundation.com/brand/*` $\rightarrow$ **Edge Cache TTL**: 7 Days.
- `api.sivarudrafoundation.com/public/events` $\rightarrow$ **Edge Cache TTL**: 60 seconds (Cache-Control: `public, s-maxage=60, stale-while-revalidate=30`).

### Bypass Cache (Strict Dynamic & Authenticated Endpoints)
- `api.sivarudrafoundation.com/admin/*` $\rightarrow$ **Bypass Cache**.
- `api.sivarudrafoundation.com/judge/*` $\rightarrow$ **Bypass Cache**.
- `api.sivarudrafoundation.com/contestant/*` $\rightarrow$ **Bypass Cache**.
- `api.sivarudrafoundation.com/auth/*` $\rightarrow$ **Bypass Cache**.
- `api.sivarudrafoundation.com/realtime/*` $\rightarrow$ **Bypass Cache**.
- `admin.sivarudrafoundation.com/*` $\rightarrow$ **Bypass Cache**.
- `judges.sivarudrafoundation.com/*` $\rightarrow$ **Bypass Cache**.
- `my.sivarudrafoundation.com/*` $\rightarrow$ **Bypass Cache**.

---

## 5. Web Application Firewall (WAF) & Rate Limiting Rules

### Rule 1: Admin & Judge Login Brute-Force Protection
- **Target Paths**: `/auth/admin/login`, `/auth/judge/login`
- **Rate Limit**: 5 requests per minute per IP.
- **Action**: Managed Challenge (CAPTCHA) or 15-minute Block upon threshold breach.

### Rule 2: Contestant & Public OTP Rate Limiting
- **Target Paths**: `/public/registrations/request-otp`, `/auth/contestant/request-otp`
- **Rate Limit**: 3 requests per 5 minutes per IP / Mobile.
- **Action**: Block for 10 minutes.

### Rule 3: Public Registration Flood Mitigation
- **Target Path**: `/public/registrations`
- **Rate Limit**: 5 requests per minute per IP.
- **Action**: Managed Challenge for suspicious patterns.

### Rule 4: Bot & Malicious Traffic Filtering
- **Cloudflare Bot Fight Mode**: ON.
- **Known Threat Score**: Block traffic with Threat Score > 40.
- **HTTP Anomalies**: Block empty user agents, malformed HTTP methods, and unauthorized direct IP scans.

---

## 6. Origin Shielding & Cloaking

1. **Direct IP Access Prevention**:
   - The origin server's firewall (AWS Security Group / UFW / Cloudflare Tunnel) should accept traffic **only** from Cloudflare IP ranges:
     - `https://www.cloudflare.com/ips/`
2. **Cloudflare Authenticated Origin Pulls**:
   - Enable Authenticated Origin Pulls using Cloudflare Client Certificates on the reverse proxy (Nginx / Caddy / Traefik) so the origin rejects any request not signed by Cloudflare.
3. **Cloudflare Tunnel (Cloudflared)**:
   - Alternatively, deploy `cloudflared` daemon on the host. This eliminates the need for open inbound ports (no public IP required on origin server).

---

## 7. Security Header Verification at Edge

Ensure Cloudflare Transform Rules or Origin Server (Helmet.js) preserves:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self' ...`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Production only)
