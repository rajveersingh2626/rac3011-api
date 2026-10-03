-- Migration: 20261003000000_normalization_and_indexes
-- Description: Safe, non-breaking database normalization, GIN performance indexes, and referential integrity

-- 1. Performance & GIN Indexes (Zero Risk)
CREATE INDEX IF NOT EXISTS "idx_reports_values_gin" ON "reports" USING GIN ("values");
CREATE INDEX IF NOT EXISTS "idx_reports_flags_gin" ON "reports" USING GIN ("flags");
CREATE INDEX IF NOT EXISTS "idx_clubs_initiatives_gin" ON "clubs" USING GIN ("initiatives");
CREATE INDEX IF NOT EXISTS "idx_club_facts_ry_year_club_id" ON "club_facts"("ry_year", "club_id");
CREATE INDEX IF NOT EXISTS "idx_club_facts_updated_by_id" ON "club_facts"("updated_by_id");
CREATE INDEX IF NOT EXISTS "idx_drishti_surgeries_operated_on" ON "drishti_surgeries"("operated_on");
CREATE INDEX IF NOT EXISTS "idx_m3011_camps_date_status" ON "m3011_camps"("date", "status");
CREATE INDEX IF NOT EXISTS "idx_m3011_camps_submitted_by_id" ON "m3011_camps"("submitted_by_id");
CREATE INDEX IF NOT EXISTS "idx_m3011_camps_reviewed_by_id" ON "m3011_camps"("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "idx_drishti_beneficiaries_created_by_id" ON "drishti_beneficiaries"("created_by_id");
CREATE INDEX IF NOT EXISTS "idx_rcl_teams_created_by_id" ON "rcl_teams"("created_by_id");
CREATE INDEX IF NOT EXISTS "idx_ride_support_clubs_created_by_id" ON "ride_support_clubs"("created_by_id");
CREATE INDEX IF NOT EXISTS "idx_club_point_entries_created_by_id" ON "club_point_entries"("created_by_id");
CREATE INDEX IF NOT EXISTS "idx_reports_submitted_by_id" ON "reports"("submitted_by_id");
CREATE INDEX IF NOT EXISTS "idx_report_queries_asked_by_id" ON "report_queries"("asked_by_id");
CREATE INDEX IF NOT EXISTS "idx_report_queries_replied_by_id" ON "report_queries"("replied_by_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor_id" ON "audit_log"("actor_id");

-- 2. Data Alignment: Synchronize Club zone strings with Zone table
UPDATE "clubs" c
SET "zone" = z."name"
FROM "zones" z
WHERE c."zone_id" = z."id" AND (c."zone" IS NULL OR c."zone" != z."name");

UPDATE "clubs" c
SET "zone_id" = z."id"
FROM "zones" z
WHERE c."zone_id" IS NULL AND c."zone" IS NOT NULL AND LOWER(TRIM(c."zone")) = LOWER(TRIM(z."name"));

-- 3. Pre-flight Orphan Data Cleanse (Safely NULL out IDs that do not exist in the "user" table)
UPDATE "reports" SET "submitted_by_id" = NULL 
WHERE "submitted_by_id" IS NOT NULL AND "submitted_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "report_queries" SET "asked_by_id" = NULL 
WHERE "asked_by_id" IS NOT NULL AND "asked_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "report_queries" SET "replied_by_id" = NULL 
WHERE "replied_by_id" IS NOT NULL AND "replied_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "m3011_camps" SET "submitted_by_id" = NULL 
WHERE "submitted_by_id" IS NOT NULL AND "submitted_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "m3011_camps" SET "reviewed_by_id" = NULL 
WHERE "reviewed_by_id" IS NOT NULL AND "reviewed_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "drishti_beneficiaries" SET "created_by_id" = NULL 
WHERE "created_by_id" IS NOT NULL AND "created_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "rcl_teams" SET "created_by_id" = NULL 
WHERE "created_by_id" IS NOT NULL AND "created_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "ride_support_clubs" SET "created_by_id" = NULL 
WHERE "created_by_id" IS NOT NULL AND "created_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "club_point_entries" SET "created_by_id" = NULL 
WHERE "created_by_id" IS NOT NULL AND "created_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "club_facts" SET "updated_by_id" = NULL 
WHERE "updated_by_id" IS NOT NULL AND "updated_by_id" NOT IN (SELECT "id" FROM "user");

UPDATE "audit_log" SET "actor_id" = NULL 
WHERE "actor_id" IS NOT NULL AND "actor_id" NOT IN (SELECT "id" FROM "user");

-- 4. Add Referential Integrity Constraints (ON DELETE SET NULL ON UPDATE CASCADE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reports_submitted_by_id_fkey') THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_submitted_by_id_fkey"
      FOREIGN KEY ("submitted_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_queries_asked_by_id_fkey') THEN
    ALTER TABLE "report_queries"
      ADD CONSTRAINT "report_queries_asked_by_id_fkey"
      FOREIGN KEY ("asked_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_queries_replied_by_id_fkey') THEN
    ALTER TABLE "report_queries"
      ADD CONSTRAINT "report_queries_replied_by_id_fkey"
      FOREIGN KEY ("replied_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'm3011_camps_submitted_by_id_fkey') THEN
    ALTER TABLE "m3011_camps"
      ADD CONSTRAINT "m3011_camps_submitted_by_id_fkey"
      FOREIGN KEY ("submitted_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'm3011_camps_reviewed_by_id_fkey') THEN
    ALTER TABLE "m3011_camps"
      ADD CONSTRAINT "m3011_camps_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drishti_beneficiaries_created_by_id_fkey') THEN
    ALTER TABLE "drishti_beneficiaries"
      ADD CONSTRAINT "drishti_beneficiaries_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rcl_teams_created_by_id_fkey') THEN
    ALTER TABLE "rcl_teams"
      ADD CONSTRAINT "rcl_teams_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ride_support_clubs_created_by_id_fkey') THEN
    ALTER TABLE "ride_support_clubs"
      ADD CONSTRAINT "ride_support_clubs_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_point_entries_created_by_id_fkey') THEN
    ALTER TABLE "club_point_entries"
      ADD CONSTRAINT "club_point_entries_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_facts_updated_by_id_fkey') THEN
    ALTER TABLE "club_facts"
      ADD CONSTRAINT "club_facts_updated_by_id_fkey"
      FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_actor_id_fkey') THEN
    ALTER TABLE "audit_log"
      ADD CONSTRAINT "audit_log_actor_id_fkey"
      FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
