-- Phase 2B Schema Migration: Safe enum rename + new fields
-- Strategy: Create new enum types, cast columns, drop old enums.
-- This avoids the "unsafe use of new enum value" PostgreSQL restriction.

-- ============================================================
-- STEP 1: Safe EventStatus enum migration (ONGOING→ACTIVE, PAST→COMPLETED)
-- ============================================================
-- Create the replacement enum
CREATE TYPE "EventStatus_new" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- Drop the default constraint so we can alter the column type
ALTER TABLE "events" ALTER COLUMN "status" DROP DEFAULT;

-- Cast existing values: ONGOING→ACTIVE, PAST→COMPLETED, others pass through
ALTER TABLE "events" ALTER COLUMN "status" TYPE "EventStatus_new"
  USING (
    CASE "status"::text
      WHEN 'ONGOING' THEN 'ACTIVE'::"EventStatus_new"
      WHEN 'PAST' THEN 'COMPLETED'::"EventStatus_new"
      ELSE "status"::text::"EventStatus_new"
    END
  );

-- Restore the default
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'UPCOMING'::"EventStatus_new";

-- Drop old enum and rename
DROP TYPE "EventStatus";
ALTER TYPE "EventStatus_new" RENAME TO "EventStatus";

-- ============================================================
-- STEP 2: Create new enums for Category and Round status
-- ============================================================
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "RoundStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED');

-- ============================================================
-- STEP 3: Add new columns to Event model
-- ============================================================
ALTER TABLE "events" ADD COLUMN "registration_open_date" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "registration_close_date" TIMESTAMP(3);

-- ============================================================
-- STEP 4: Add new columns to Category model
-- ============================================================
ALTER TABLE "categories" ADD COLUMN "description" TEXT;
ALTER TABLE "categories" ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE';

-- ============================================================
-- STEP 5: Add new columns to Round model
-- ============================================================
ALTER TABLE "rounds" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rounds" ADD COLUMN "status" "RoundStatus" NOT NULL DEFAULT 'DRAFT';
