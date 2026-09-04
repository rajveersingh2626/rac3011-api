-- Baseline: the five tables that exist in the legacy production database
-- (docs/legacy/schema.sql, without RLS policies, Supabase grants and plpgsql functions).

CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "author_name" TEXT DEFAULT 'District Secretariat',
    "sent_via_email" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "target_audience" TEXT DEFAULT 'all',
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "zone" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "president" TEXT,
    "is_director" TEXT DEFAULT '',
    "phone" TEXT,
    "email" TEXT,
    "rotary_id" TEXT,
    "secretary" TEXT,
    "secretary_email" TEXT,
    "secretary_phone" TEXT,
    "initiatives" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) DEFAULT now(),
    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monthly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "month" TEXT NOT NULL,
    "club_name" TEXT NOT NULL,
    "club_email" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "status" TEXT DEFAULT 'reported',
    "flag_comment" TEXT,
    "sections_json" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) DEFAULT now(),
    "flag_reason" TEXT,
    "flagged_by" TEXT,
    "flagged_at" TIMESTAMPTZ(6),
    "section_flags" JSONB DEFAULT '{}',
    CONSTRAINT "monthly_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID,
    "club_name" TEXT NOT NULL,
    "club_email" TEXT,
    "submitted_by" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "budget" TEXT,
    "beneficiaries" TEXT,
    "proof_url" TEXT,
    "status" TEXT DEFAULT 'reported',
    "flag_comment" TEXT,
    "submitted_at" TIMESTAMPTZ(6) DEFAULT now(),
    CONSTRAINT "project_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_submissions_status_check" CHECK ("status" = ANY (ARRAY['reported'::text, 'flagged'::text]))
);

CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rotary_id" TEXT,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'president',
    "post" TEXT DEFAULT 'Club President',
    "club_name" TEXT DEFAULT 'District 3011',
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "totp_secret" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "reset_token" TEXT,
    "reset_token_expires_at" TIMESTAMPTZ(6),
    "is_test_group" BOOLEAN DEFAULT false,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_profiles_role_check" CHECK ("role" = ANY (ARRAY['officer'::text, 'president'::text, 'secretary'::text, 'dac_member'::text]))
);

CREATE INDEX "idx_announcements_audience" ON "announcements"("target_audience");
CREATE INDEX "idx_announcements_created_at" ON "announcements"("created_at" DESC);
CREATE INDEX "idx_clubs_email" ON "clubs"("email");
CREATE INDEX "idx_clubs_rotary_id" ON "clubs"("rotary_id");
CREATE INDEX "idx_clubs_zone" ON "clubs"("zone");
CREATE INDEX "idx_monthly_reports_club_month" ON "monthly_reports"("club_email", "month");
CREATE INDEX "idx_monthly_reports_status" ON "monthly_reports"("status");
CREATE INDEX "idx_monthly_reports_submitted_at" ON "monthly_reports"("submitted_at" DESC);
CREATE INDEX "idx_project_submissions_club_email" ON "project_submissions"("club_email");
CREATE INDEX "idx_project_submissions_submitted_at" ON "project_submissions"("submitted_at" DESC);
CREATE INDEX "idx_user_profiles_email" ON "user_profiles"(lower("email"));
CREATE INDEX "idx_user_profiles_role" ON "user_profiles"("role");
CREATE INDEX "idx_user_profiles_rotary_id" ON "user_profiles"("rotary_id");

-- D1: isolate legacy tables; only clubs is kept and extended.
ALTER TABLE "user_profiles" RENAME TO "legacy_user_profiles";
ALTER TABLE "monthly_reports" RENAME TO "legacy_monthly_reports";
ALTER TABLE "project_submissions" RENAME TO "legacy_project_submissions";
ALTER TABLE "announcements" RENAME TO "legacy_announcements";
