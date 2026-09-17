-- Add gallery_type to gallery_items
ALTER TABLE "gallery_items" ADD COLUMN IF NOT EXISTS "gallery_type" TEXT NOT NULL DEFAULT 'district';
CREATE INDEX IF NOT EXISTS "gallery_items_gallery_type_idx" ON "gallery_items"("gallery_type");

-- Ensure ride_participants columns exist and are decoupled
ALTER TABLE "ride_participants" DROP CONSTRAINT IF EXISTS "ride_participants_user_id_fkey";
ALTER TABLE "ride_participants" DROP CONSTRAINT IF EXISTS "ride_participants_club_id_fkey";
ALTER TABLE "ride_participants" DROP COLUMN IF EXISTS "user_id";

ALTER TABLE "ride_participants" 
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS "dossier_status" TEXT NOT NULL DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS "dossier_data" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
