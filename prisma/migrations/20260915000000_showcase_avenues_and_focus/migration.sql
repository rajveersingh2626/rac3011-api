-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "avenue_of_service" TEXT DEFAULT 'Community Services';
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "areas_of_focus" TEXT[] DEFAULT ARRAY[]::TEXT[];
