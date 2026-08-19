# Siva Rudra Foundation Event Management Platform

A production-grade Event Management Platform for Siva Rudra Foundations, built as a TypeScript monorepo with high-fidelity, cinematic luxury design language.

---

## 1. Project Architecture

This monorepo utilizes **npm workspaces** to separate distinct user surfaces, data validations, database models, and API logic. It ensures compilation safety, component reusability, and scalable deployment capabilities.

```
├── package.json (root workspaces config)
├── tsconfig.json (root typescript rules)
├── apps/
│   ├── public/       - Landing & Registrations
│   ├── admin/        - Event Configuration & Orchestration
│   ├── judges/       - Blind Scoring Console
│   ├── stage/        - Live LED Leaderboard Display
│   └── contestant/   - Mobile Participant Dashboard
├── backend/
│   └── api/          - NestJS API Server
├── packages/
│   ├── config/       - ESLint, TS, and Tailwind tokens
│   ├── ui/           - Premium React Component Library
│   ├── types/        - TypeScript Entity Declarations
│   └── validation/   - Zod Input Verification Schemas
├── database/
│   └── prisma/       - Prisma Database Schemas
├── reference/
│   ├── brand/        - Pageant Brand Guidelines
│   └── ui-reference/ - Cinematic Visual references
├── infrastructure/   - Nginx Proxy & Docker Cluster configs
└── docs/             - Technical Documentation
```

---

## 2. Subdomain to App Mapping

The platform operates on five production domains, mapped as follows:

| Domain | Monorepo Application Path | Target Audience & Port | Core Purpose |
| :--- | :--- | :--- | :--- |
| `https://sivarudrafoundation.com` | `apps/public` | Public / Port `3000` | Discovery, past results review, registration. |
| `https://admin.sivarudrafoundation.com` | `apps/admin` | Admins / Port `3001` | Event creation, payment checking, judge management. |
| `https://judges.sivarudrafoundation.com` | `apps/judges` | Judges / Port `3002` | Blind scoring entry based strictly on Contestant IDs. |
| `https://stage.sivarudrafoundation.com` | `apps/stage` | Venue Displays / Port `3003` | Real-time full-screen LED leaderboard ranking. |
| `https://my.sivarudrafoundation.com` | `apps/contestant` | Contestants / Port `3004` | Passwordless access to view scores & live rank. |

---

## 3. Backend Architecture

- **Path**: `backend/api` (Port `4000`)
- **Technology**: Node.js, NestJS, TypeScript, Socket.IO
- **Purpose**:
  - Exposes RESTful APIs for client actions (registration, administration, scoring).
  - Drives automatic scoring computations (averaging, optional "drop highest and lowest" trimming).
  - Handles WebSocket connections to push leaderboard updates to `apps/stage` and `apps/contestant`.
  - Integrates third-party services: Twilio/Meta Business API for WhatsApp notifications.

---

## 4. Shared Packages

To ensure consistency and enforce formatting rules, the following packages are compiled and linked across the workspace:

1. **`@srf/config`**: Base shared configurations. Contains:
   - `tsconfig.base.json` (Strict TS rules)
   - `tailwind.config.js` (Brand design tokens: Black, Gold, White, Serif headings, and pixel-aligned layout guidelines)
2. **`@srf/types`**: Defines TS types. Standardizes data exchanges between Next.js clients and the NestJS server.
3. **`@srf/validation`**: Encapsulates Zod input validators. Runs on the client side (form feedback) and server side (request payload validation).
4. **`@srf/ui`**: Premium React components. Enforces rigid, aligned layouts to prevent design regressions (e.g. random padding/margins or misaligned button heights).

---

## 5. Database Directory

- **Path**: `database/prisma`
- **ORM**: Prisma (using PostgreSQL provider)
- **Primary Schema Entities**:
  - `Event`: General tournament dates, names, locations.
  - `Category`: Groups (Kids, Teen, Miss, Ms, Mr).
  - `Round`: Specific tournament steps (Traditional, Discipline, Talent, Western).
  - `Registration`: Raw submission profile metadata.
  - `Contestant`: Paid, active pageantry participants with generated alphanumeric codes (e.g. `SRF-NLR-K-0003`).
  - `Score`: Locked scoring points per round per judge.
  - `JudgeAccount` / `AdminUser`: Authentication credentials.

---

## 6. Reference Directory

- **Path**: `reference/`
- **Purpose**: Holds project brand manuals (`reference/brand/`) and visual inspiration guides (`reference/ui-reference/`).
- **Technical Specification**: The official architectural guide is preserved in [docs/Siva_Rudra_Foundations_Technical_Specification.pdf](file:///c:/Users/shaik/Documents/nellore%20nerajana/docs/Siva_Rudra_Foundations_Technical_Specification.pdf).

---

## 7. Phase 1 Development & Verification Commands

### Database Migrations & Client Generation
Prisma schema modifications are mapped to standard database constraints and indexes. Execute these commands at the root of the monorepo:
* **Prisma Client Generation**:
  ```bash
  npm run db:generate
  ```
* **Apply Database Migrations**:
  ```bash
  npm run db:migrate
  ```

### Development Seeding
Populate the local database with development-only mock credentials and a test event/category/round:
* **Run Database Seeder**:
  ```bash
  npx prisma db seed --schema=database/prisma/schema.prisma
  ```
*Note: Seeding outputs temporary passwords and the Google Authenticator TOTP secret setup keys to the CLI console.*

### Running Security Audits & Tests
The security boundary checks (Judge Blindness filters, dynamic DB-verified round restrictions, rate limiters, score locks, and log sanitization) are checked via automated tests:
* **Run Backend Security Tests**:
  ```bash
  npm run test --workspace=@srf/api
  ```
* **Verify System Lint & Build Quality**:
  ```bash
  npm run lint
  npm run typecheck
  npm run build
  ```

