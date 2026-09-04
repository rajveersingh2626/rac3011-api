-- CreateEnum
CREATE TYPE "StorageTier" AS ENUM ('permanent', 'dynamic', 'private');

-- CreateEnum
CREATE TYPE "UploadGrantStatus" AS ENUM ('pending', 'finalised', 'expired');

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "tier" "StorageTier" NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "url" TEXT,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "club_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_grants" (
    "id" TEXT NOT NULL,
    "tier" "StorageTier" NOT NULL,
    "provider" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "club_id" TEXT,
    "user_id" TEXT NOT NULL,
    "upload_url" TEXT NOT NULL,
    "status" "UploadGrantStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_resource_type_resource_id_idx" ON "files"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "files_tier_idx" ON "files"("tier");

-- CreateIndex
CREATE INDEX "files_club_id_idx" ON "files"("club_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_id_idx" ON "files"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "upload_grants_file_id_key" ON "upload_grants"("file_id");

-- CreateIndex
CREATE INDEX "upload_grants_status_idx" ON "upload_grants"("status");

-- CreateIndex
CREATE INDEX "upload_grants_user_id_idx" ON "upload_grants"("user_id");

-- CreateIndex
CREATE INDEX "upload_grants_expires_at_idx" ON "upload_grants"("expires_at");

