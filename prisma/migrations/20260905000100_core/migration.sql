-- CreateEnum
CREATE TYPE "ProjectKey" AS ENUM ('mission3011', 'drishti', 'rcl', 'careerbridge', 'ride');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('email', 'push');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('text', 'richtext', 'image', 'link', 'list');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('unchecked', 'ok', 'broken', 'private');

-- CreateEnum
CREATE TYPE "TeamKind" AS ENUM ('core', 'dsc');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('chartered_club', 'award', 'milestone');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('pending', 'granted');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('directory', 'newsletter');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('documents', 'forms', 'logos', 'photos', 'guest_kit', 'templates');

-- CreateEnum
CREATE TYPE "EnquiryKind" AS ENUM ('new_club', 'sponsor', 'contact');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'maybe', 'not_going');

-- CreateEnum
CREATE TYPE "CheckinMethod" AS ENUM ('qr', 'manual', 'walk_in');

-- CreateEnum
CREATE TYPE "BookingPurpose" AS ENUM ('installation', 'club_event', 'meeting');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('requested', 'held', 'confirmed', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('open', 'reviewed', 'closed');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('flat', 'per_unit', 'tiered', 'penalty');

-- CreateEnum
CREATE TYPE "RulePeriod" AS ENUM ('monthly', 'yearly', 'once');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('report_field', 'club_fact', 'event_attendance', 'project_collaboration', 'ride_hosting', 'club_events');

-- CreateEnum
CREATE TYPE "EntryKind" AS ENUM ('computed', 'judged');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('pending', 'approved', 'suspended');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('none', 'club', 'zone', 'project');

-- CreateEnum
CREATE TYPE "SchemaStatus" AS ENUM ('draft', 'active', 'retired');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'textarea', 'number', 'select', 'multiselect', 'link', 'date', 'boolean', 'clubs');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('draft', 'submitted', 'queried', 'scored');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'submitted', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "ProjectClubRole" AS ENUM ('lead', 'collaborator');

-- CreateEnum
CREATE TYPE "EffortKind" AS ENUM ('admin', 'self');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CampStatus" AS ENUM ('submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DrishtiStage" AS ENUM ('screened', 'scheduled', 'operated', 'followup', 'closed');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('registered', 'confirmed', 'withdrawn');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('scheduled', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('job', 'internship', 'mentorship');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('pending_email', 'pending', 'verified', 'filled', 'expired', 'rejected');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('planned', 'confirmed', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "charter_date" DATE,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "meeting_info" TEXT,
ADD COLUMN     "member_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "social_links" JSONB,
ADD COLUMN     "zone_id" TEXT,
ALTER COLUMN "initiatives" SET DEFAULT '[]';
UPDATE "clubs" SET "initiatives" = '[]'::jsonb WHERE "initiatives" IS NULL;
ALTER TABLE "clubs" ALTER COLUMN "initiatives" SET NOT NULL;

-- AlterTable
ALTER TABLE "legacy_announcements" RENAME CONSTRAINT "announcements_pkey" TO "legacy_announcements_pkey";

-- AlterTable
ALTER TABLE "legacy_monthly_reports" RENAME CONSTRAINT "monthly_reports_pkey" TO "legacy_monthly_reports_pkey";

-- AlterTable
ALTER TABLE "legacy_project_submissions" RENAME CONSTRAINT "project_submissions_pkey" TO "legacy_project_submissions_pkey";

-- AlterTable
ALTER TABLE "legacy_user_profiles" RENAME CONSTRAINT "user_profiles_pkey" TO "legacy_user_profiles_pkey";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "mfa_pending" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "password" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failed_verification_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_board_members" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "member_id" TEXT,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "blood_group" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ry_year" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_facts" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "ry_year" INTEGER NOT NULL,
    "dues_paid_on" DATE,
    "ri_citation_completed" BOOLEAN NOT NULL DEFAULT false,
    "paul_harris_fellows" INTEGER NOT NULL DEFAULT 0,
    "dual_members" INTEGER NOT NULL DEFAULT 0,
    "mdio_committee_members" INTEGER NOT NULL DEFAULT 0,
    "mdio_events_attended" INTEGER NOT NULL DEFAULT 0,
    "sister_club_signed_on" DATE,
    "drr_visit_on" DATE,
    "vocational_centre_on" DATE,
    "active_social_handles" INTEGER NOT NULL DEFAULT 0,
    "club_merchandise" BOOLEAN NOT NULL DEFAULT false,
    "club_website_url" TEXT,
    "prior_year_member_count" INTEGER,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" JSONB NOT NULL,
    "channels" TEXT[] DEFAULT ARRAY['portal']::TEXT[],
    "send_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "recipient_count" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "legacy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reads" (
    "announcement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("announcement_id","user_id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "to_user_id" TEXT,
    "to_address" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'queued',
    "provider" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_provider_usage" (
    "provider" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_provider_usage_pkey" PRIMARY KEY ("provider","day")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "page_key" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "draft_value" JSONB NOT NULL,
    "published_value" JSONB,
    "published_at" TIMESTAMP(3),
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "asset_links" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'unchecked',
    "last_checked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "owner_user_id" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_drrs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "terms" TEXT[],
    "home_club_id" TEXT,
    "photo_url" TEXT,
    "bio" TEXT,
    "order" INTEGER NOT NULL,
    "is_low_res_photo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "past_drrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_team" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "kind" "TeamKind" NOT NULL,
    "order" INTEGER NOT NULL,
    "photo_url" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "bio" TEXT,
    "club_id" TEXT,
    "ry_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "district_team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "title" TEXT NOT NULL,
    "club_id" TEXT,
    "date" DATE NOT NULL,
    "certificate_url" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "tier" TEXT NOT NULL,
    "website" TEXT,
    "permission_status" "PermissionStatus" NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "PublicationType" NOT NULL,
    "url" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "cover_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "required_permission" TEXT,
    "coming_soon_month" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sister_club_requests" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "partner_club_name" TEXT NOT NULL,
    "partner_district" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "signed_on" DATE,
    "submitted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sister_club_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "kind" "EnquiryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organisation" TEXT,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "routed_to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "year" INTEGER NOT NULL,
    "count" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "is_district_event" BOOLEAN NOT NULL DEFAULT true,
    "club_id" TEXT,
    "project_key" "ProjectKey",
    "rsvp_open" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "event_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("event_id","member_id")
);

-- CreateTable
CREATE TABLE "event_checkins" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "member_id" TEXT,
    "walk_in_name" TEXT,
    "club_id" TEXT NOT NULL,
    "method" "CheckinMethod" NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drr_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "purpose" "BookingPurpose" NOT NULL,
    "club_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_phone" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'requested',
    "google_event_id" TEXT,
    "decision_reason" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drr_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drr_blocks" (
    "id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drr_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "submitted_by_id" TEXT,
    "club_id" TEXT,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "event_id" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'open',
    "reply" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_rules" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rule_type" "RuleType" NOT NULL,
    "period" "RulePeriod" NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "source_key" TEXT NOT NULL,
    "numerator_key" TEXT,
    "denominator_key" TEXT,
    "points" DECIMAL(10,2),
    "per_unit_cap" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ry_year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_rule_tiers" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "min" DECIMAL(10,2) NOT NULL,
    "max" DECIMAL(10,2),
    "points" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_rule_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_point_entries" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "ry_year" INTEGER NOT NULL,
    "period_key" TEXT NOT NULL,
    "rule_id" TEXT,
    "category_id" TEXT NOT NULL,
    "kind" "EntryKind" NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "trace" JSONB,
    "source_type" TEXT,
    "source_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_point_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "rotary_id" TEXT,
    "club_id" TEXT NOT NULL,
    "photo_url" TEXT,
    "bio" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "membership_anniversary" DATE,
    "status" "MemberStatus" NOT NULL DEFAULT 'pending',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "qr_token" TEXT NOT NULL,
    "directory_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "is_dac_member" BOOLEAN NOT NULL DEFAULT false,
    "theme_preference" TEXT NOT NULL DEFAULT 'system',
    "legacy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "scope_type" "ScopeType" NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" TEXT,
    "granted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_form_schemas" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "SchemaStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_form_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_form_fields" (
    "id" TEXT NOT NULL,
    "schema_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "help_text" TEXT,
    "per_activity" BOOLEAN NOT NULL DEFAULT false,
    "point_source_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "ry_year" INTEGER NOT NULL,
    "month" DATE NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'draft',
    "values" JSONB NOT NULL,
    "notes" TEXT,
    "submitted_by_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "filed_on_time" BOOLEAN,
    "scored_at" TIMESTAMP(3),
    "legacy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_queries" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "asked_by_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "reply" TEXT,
    "replied_by_id" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "audience" JSONB NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_request_responses" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_request_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "beneficiaries" INTEGER,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_by_id" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "consent_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    "published_title" TEXT,
    "published_summary" TEXT,
    "published_body" TEXT,
    "editor_notes" TEXT,
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "published_by_id" TEXT,
    "legacy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_clubs" (
    "project_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "role" "ProjectClubRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_clubs_pkey" PRIMARY KEY ("project_id","club_id")
);

-- CreateTable
CREATE TABLE "effort_log" (
    "id" TEXT NOT NULL,
    "kind" "EffortKind" NOT NULL,
    "member_id" TEXT,
    "person_name" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "task_description" TEXT NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "date" DATE NOT NULL,
    "logged_by_id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'approved',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "points_awarded" DECIMAL(10,2),
    "point_entry_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "effort_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "threshold" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_badges" (
    "member_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_badges_pkey" PRIMARY KEY ("member_id","badge_id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by_id" TEXT,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_privacy_acceptances" (
    "member_id" TEXT NOT NULL,
    "policy_published_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_privacy_acceptances_pkey" PRIMARY KEY ("member_id","policy_published_at")
);

-- CreateTable
CREATE TABLE "skill_tags" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m3011_camps" (
    "id" TEXT NOT NULL,
    "lead_club_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT,
    "units_collected" INTEGER NOT NULL,
    "donors_registered" INTEGER,
    "partner_blood_bank" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "CampStatus" NOT NULL DEFAULT 'submitted',
    "submitted_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m3011_camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "m3011_camp_clubs" (
    "camp_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "m3011_camp_clubs_pkey" PRIMARY KEY ("camp_id","club_id")
);

-- CreateTable
CREATE TABLE "drishti_beneficiaries" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "phone_encrypted" TEXT,
    "eye" TEXT NOT NULL,
    "screened_on" DATE NOT NULL,
    "camp_location" TEXT,
    "stage" "DrishtiStage" NOT NULL DEFAULT 'screened',
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drishti_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drishti_surgeries" (
    "id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "hospital" TEXT NOT NULL,
    "operated_on" DATE NOT NULL,
    "outcome" TEXT,
    "followup_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drishti_surgeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rcl_teams" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "club_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captain_name" TEXT NOT NULL,
    "captain_phone" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'registered',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rcl_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rcl_players" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "member_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rcl_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rcl_fixtures" (
    "id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "status" "FixtureStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rcl_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rcl_results" (
    "fixture_id" TEXT NOT NULL,
    "home_runs" INTEGER NOT NULL,
    "home_wickets" INTEGER NOT NULL,
    "home_overs" DECIMAL(4,1) NOT NULL,
    "away_runs" INTEGER NOT NULL,
    "away_wickets" INTEGER NOT NULL,
    "away_overs" DECIMAL(4,1) NOT NULL,
    "winner_team_id" TEXT,
    "notes" TEXT,
    "entered_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rcl_results_pkey" PRIMARY KEY ("fixture_id")
);

-- CreateTable
CREATE TABLE "cb_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "location" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "stipend" TEXT,
    "description" TEXT NOT NULL,
    "apply_url" TEXT,
    "contact_email" TEXT NOT NULL,
    "posted_by_name" TEXT NOT NULL,
    "posted_by_email" TEXT NOT NULL,
    "rotary_affiliation" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'pending_email',
    "verify_token" TEXT,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "filled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cb_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_support_clubs" (
    "id" TEXT NOT NULL,
    "ry_year" INTEGER NOT NULL,
    "club_id" TEXT NOT NULL,
    "capacity_delegates" INTEGER NOT NULL,
    "homestay_available" BOOLEAN NOT NULL,
    "preferred_months" INTEGER[],
    "contact_member_id" TEXT,
    "contact_phone" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_support_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_delegations" (
    "id" TEXT NOT NULL,
    "ry_year" INTEGER NOT NULL,
    "visiting_district" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "headcount" INTEGER NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT,
    "status" "DelegationStatus" NOT NULL DEFAULT 'planned',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_delegation_hosts" (
    "id" TEXT NOT NULL,
    "delegation_id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "days_hosted" INTEGER NOT NULL,
    "members_sent" INTEGER NOT NULL DEFAULT 0,
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_delegation_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_gallery_items" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "account_user_id_idx" ON "account"("user_id");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "two_factor_user_id_idx" ON "two_factor"("user_id");

-- CreateIndex
CREATE INDEX "two_factor_secret_idx" ON "two_factor"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE INDEX "club_board_members_club_id_ry_year_idx" ON "club_board_members"("club_id", "ry_year");

-- CreateIndex
CREATE UNIQUE INDEX "club_facts_club_id_ry_year_key" ON "club_facts"("club_id", "ry_year");

-- CreateIndex
CREATE UNIQUE INDEX "announcements_legacy_id_key" ON "announcements"("legacy_id");

-- CreateIndex
CREATE INDEX "announcements_sent_at_idx" ON "announcements"("sent_at");

-- CreateIndex
CREATE INDEX "announcement_reads_user_id_idx" ON "announcement_reads"("user_id");

-- CreateIndex
CREATE INDEX "notification_outbox_status_idx" ON "notification_outbox"("status");

-- CreateIndex
CREATE INDEX "notification_outbox_to_user_id_idx" ON "notification_outbox"("to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_page_key_section_key_key" ON "content_blocks"("page_key", "section_key");

-- CreateIndex
CREATE INDEX "asset_links_status_idx" ON "asset_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_links_resource_type_resource_id_url_key" ON "asset_links"("resource_type", "resource_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "past_drrs_slug_key" ON "past_drrs"("slug");

-- CreateIndex
CREATE INDEX "district_team_club_id_idx" ON "district_team"("club_id");

-- CreateIndex
CREATE INDEX "district_team_ry_year_idx" ON "district_team"("ry_year");

-- CreateIndex
CREATE INDEX "achievements_club_id_idx" ON "achievements"("club_id");

-- CreateIndex
CREATE INDEX "achievements_date_idx" ON "achievements"("date");

-- CreateIndex
CREATE INDEX "sister_club_requests_club_id_idx" ON "sister_club_requests"("club_id");

-- CreateIndex
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_starts_at_idx" ON "events"("starts_at");

-- CreateIndex
CREATE INDEX "events_club_id_idx" ON "events"("club_id");

-- CreateIndex
CREATE INDEX "events_project_key_idx" ON "events"("project_key");

-- CreateIndex
CREATE INDEX "event_rsvps_member_id_idx" ON "event_rsvps"("member_id");

-- CreateIndex
CREATE INDEX "event_checkins_event_id_club_id_idx" ON "event_checkins"("event_id", "club_id");

-- CreateIndex
CREATE INDEX "event_checkins_member_id_idx" ON "event_checkins"("member_id");

-- CreateIndex
CREATE INDEX "event_checkins_club_id_idx" ON "event_checkins"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_checkins_event_id_member_id_key" ON "event_checkins"("event_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "drr_bookings_reference_key" ON "drr_bookings"("reference");

-- CreateIndex
CREATE INDEX "drr_bookings_starts_at_idx" ON "drr_bookings"("starts_at");

-- CreateIndex
CREATE INDEX "drr_bookings_status_idx" ON "drr_bookings"("status");

-- CreateIndex
CREATE INDEX "drr_bookings_club_id_idx" ON "drr_bookings"("club_id");

-- CreateIndex
CREATE INDEX "drr_blocks_starts_at_idx" ON "drr_blocks"("starts_at");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_club_id_idx" ON "feedback"("club_id");

-- CreateIndex
CREATE INDEX "feedback_event_id_idx" ON "feedback"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "point_categories_key_key" ON "point_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "point_rules_key_key" ON "point_rules"("key");

-- CreateIndex
CREATE INDEX "point_rules_category_id_idx" ON "point_rules"("category_id");

-- CreateIndex
CREATE INDEX "point_rules_ry_year_is_active_idx" ON "point_rules"("ry_year", "is_active");

-- CreateIndex
CREATE INDEX "point_rule_tiers_rule_id_idx" ON "point_rule_tiers"("rule_id");

-- CreateIndex
CREATE INDEX "club_point_entries_club_id_ry_year_idx" ON "club_point_entries"("club_id", "ry_year");

-- CreateIndex
CREATE INDEX "club_point_entries_rule_id_idx" ON "club_point_entries"("rule_id");

-- CreateIndex
CREATE INDEX "club_point_entries_category_id_idx" ON "club_point_entries"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_user_id_key" ON "member_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_email_key" ON "member_profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_qr_token_key" ON "member_profiles"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_legacy_id_key" ON "member_profiles"("legacy_id");

-- CreateIndex
CREATE INDEX "member_profiles_club_id_idx" ON "member_profiles"("club_id");

-- CreateIndex
CREATE INDEX "member_profiles_status_idx" ON "member_profiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "user_roles_scope_type_scope_id_idx" ON "user_roles"("scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_scope_type_scope_id_key" ON "user_roles"("user_id", "role_id", "scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "audit_log_resource_type_resource_id_idx" ON "audit_log"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_at_idx" ON "audit_log"("at");

-- CreateIndex
CREATE UNIQUE INDEX "report_form_schemas_version_key" ON "report_form_schemas"("version");

-- CreateIndex
CREATE UNIQUE INDEX "report_form_fields_schema_id_field_key_key" ON "report_form_fields"("schema_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "reports_legacy_id_key" ON "reports"("legacy_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_ry_year_month_idx" ON "reports"("ry_year", "month");

-- CreateIndex
CREATE INDEX "reports_schema_version_idx" ON "reports"("schema_version");

-- CreateIndex
CREATE UNIQUE INDEX "reports_club_id_month_key" ON "reports"("club_id", "month");

-- CreateIndex
CREATE INDEX "report_queries_report_id_idx" ON "report_queries"("report_id");

-- CreateIndex
CREATE INDEX "report_requests_due_at_idx" ON "report_requests"("due_at");

-- CreateIndex
CREATE INDEX "report_request_responses_club_id_idx" ON "report_request_responses"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_request_responses_request_id_club_id_key" ON "report_request_responses"("request_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_legacy_id_key" ON "projects"("legacy_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_published_at_idx" ON "projects"("published_at");

-- CreateIndex
CREATE INDEX "projects_submitted_by_id_idx" ON "projects"("submitted_by_id");

-- CreateIndex
CREATE INDEX "project_clubs_club_id_idx" ON "project_clubs"("club_id");

-- CreateIndex
CREATE INDEX "effort_log_club_id_idx" ON "effort_log"("club_id");

-- CreateIndex
CREATE INDEX "effort_log_member_id_idx" ON "effort_log"("member_id");

-- CreateIndex
CREATE INDEX "effort_log_status_idx" ON "effort_log"("status");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE INDEX "member_badges_badge_id_idx" ON "member_badges"("badge_id");

-- CreateIndex
CREATE INDEX "certificates_member_id_idx" ON "certificates"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_tags_label_key" ON "skill_tags"("label");

-- CreateIndex
CREATE INDEX "m3011_camps_status_idx" ON "m3011_camps"("status");

-- CreateIndex
CREATE INDEX "m3011_camps_lead_club_id_idx" ON "m3011_camps"("lead_club_id");

-- CreateIndex
CREATE INDEX "m3011_camps_date_idx" ON "m3011_camps"("date");

-- CreateIndex
CREATE INDEX "m3011_camp_clubs_club_id_idx" ON "m3011_camp_clubs"("club_id");

-- CreateIndex
CREATE INDEX "drishti_beneficiaries_club_id_idx" ON "drishti_beneficiaries"("club_id");

-- CreateIndex
CREATE INDEX "drishti_beneficiaries_stage_idx" ON "drishti_beneficiaries"("stage");

-- CreateIndex
CREATE INDEX "drishti_surgeries_beneficiary_id_idx" ON "drishti_surgeries"("beneficiary_id");

-- CreateIndex
CREATE INDEX "rcl_teams_club_id_idx" ON "rcl_teams"("club_id");

-- CreateIndex
CREATE INDEX "rcl_teams_status_idx" ON "rcl_teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rcl_teams_season_club_id_key" ON "rcl_teams"("season", "club_id");

-- CreateIndex
CREATE INDEX "rcl_players_team_id_idx" ON "rcl_players"("team_id");

-- CreateIndex
CREATE INDEX "rcl_fixtures_season_scheduled_at_idx" ON "rcl_fixtures"("season", "scheduled_at");

-- CreateIndex
CREATE INDEX "rcl_fixtures_home_team_id_idx" ON "rcl_fixtures"("home_team_id");

-- CreateIndex
CREATE INDEX "rcl_fixtures_away_team_id_idx" ON "rcl_fixtures"("away_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "cb_listings_verify_token_key" ON "cb_listings"("verify_token");

-- CreateIndex
CREATE INDEX "cb_listings_status_idx" ON "cb_listings"("status");

-- CreateIndex
CREATE INDEX "ride_support_clubs_club_id_idx" ON "ride_support_clubs"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_support_clubs_ry_year_club_id_key" ON "ride_support_clubs"("ry_year", "club_id");

-- CreateIndex
CREATE INDEX "ride_delegations_status_idx" ON "ride_delegations"("status");

-- CreateIndex
CREATE INDEX "ride_delegations_ry_year_starts_at_idx" ON "ride_delegations"("ry_year", "starts_at");

-- CreateIndex
CREATE INDEX "ride_delegation_hosts_club_id_idx" ON "ride_delegation_hosts"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_delegation_hosts_delegation_id_club_id_key" ON "ride_delegation_hosts"("delegation_id", "club_id");

-- CreateIndex
CREATE INDEX "ride_gallery_items_year_idx" ON "ride_gallery_items"("year");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- CreateIndex
CREATE INDEX "clubs_zone_id_idx" ON "clubs"("zone_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_board_members" ADD CONSTRAINT "club_board_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_facts" ADD CONSTRAINT "club_facts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_team" ADD CONSTRAINT "district_team_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sister_club_requests" ADD CONSTRAINT "sister_club_requests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drr_bookings" ADD CONSTRAINT "drr_bookings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_rules" ADD CONSTRAINT "point_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "point_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_rule_tiers" ADD CONSTRAINT "point_rule_tiers_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "point_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_point_entries" ADD CONSTRAINT "club_point_entries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_point_entries" ADD CONSTRAINT "club_point_entries_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "point_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_point_entries" ADD CONSTRAINT "club_point_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "point_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_form_fields" ADD CONSTRAINT "report_form_fields_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "report_form_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_schema_version_fkey" FOREIGN KEY ("schema_version") REFERENCES "report_form_schemas"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_queries" ADD CONSTRAINT "report_queries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request_responses" ADD CONSTRAINT "report_request_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "report_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request_responses" ADD CONSTRAINT "report_request_responses_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_clubs" ADD CONSTRAINT "project_clubs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_clubs" ADD CONSTRAINT "project_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effort_log" ADD CONSTRAINT "effort_log_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_badges" ADD CONSTRAINT "member_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_privacy_acceptances" ADD CONSTRAINT "member_privacy_acceptances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m3011_camps" ADD CONSTRAINT "m3011_camps_lead_club_id_fkey" FOREIGN KEY ("lead_club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m3011_camp_clubs" ADD CONSTRAINT "m3011_camp_clubs_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "m3011_camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "m3011_camp_clubs" ADD CONSTRAINT "m3011_camp_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drishti_beneficiaries" ADD CONSTRAINT "drishti_beneficiaries_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drishti_surgeries" ADD CONSTRAINT "drishti_surgeries_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "drishti_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcl_teams" ADD CONSTRAINT "rcl_teams_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcl_players" ADD CONSTRAINT "rcl_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "rcl_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcl_fixtures" ADD CONSTRAINT "rcl_fixtures_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "rcl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcl_fixtures" ADD CONSTRAINT "rcl_fixtures_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "rcl_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rcl_results" ADD CONSTRAINT "rcl_results_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "rcl_fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_support_clubs" ADD CONSTRAINT "ride_support_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_delegation_hosts" ADD CONSTRAINT "ride_delegation_hosts_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "ride_delegations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_delegation_hosts" ADD CONSTRAINT "ride_delegation_hosts_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes (spec §3.3); Prisma cannot express these, so they live only here.
DROP INDEX IF EXISTS "club_point_entries_club_id_rule_id_period_key_key";
CREATE UNIQUE INDEX "club_point_entries_computed_idempotent" ON "club_point_entries" ("club_id", "rule_id", "period_key") WHERE "kind" = 'computed';
CREATE UNIQUE INDEX "club_point_entries_judged_one_per_month" ON "club_point_entries" ("club_id", "period_key") WHERE "kind" = 'judged' AND "source_type" IS NULL;
CREATE UNIQUE INDEX "project_clubs_one_lead_per_project" ON "project_clubs" ("project_id") WHERE "role" = 'lead';
