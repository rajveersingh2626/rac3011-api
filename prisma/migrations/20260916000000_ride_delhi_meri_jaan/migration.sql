-- CreateEnum
CREATE TYPE "RideParticipantType" AS ENUM ('external', 'internal_rotaractor');

-- CreateEnum
CREATE TYPE "RideParticipantStatus" AS ENUM ('pending', 'approved', 'confirmed', 'rejected', 'waitlist');

-- CreateTable
CREATE TABLE "ride_participants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "club_id" TEXT,
    "participant_type" "RideParticipantType" NOT NULL DEFAULT 'external',
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT,
    "district_number" TEXT,
    "club_name" TEXT,
    "rotary_role" TEXT,
    "status" "RideParticipantStatus" NOT NULL DEFAULT 'pending',
    "arrival_mode" TEXT,
    "arrival_date_time" TIMESTAMP(3),
    "pnr_number" TEXT,
    "arrival_location" TEXT,
    "departure_date_time" TIMESTAMP(3),
    "dietary_preference" TEXT,
    "allergies" TEXT,
    "tshirt_size" TEXT,
    "blood_group" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "govt_id_number" TEXT,
    "notes" TEXT,
    "assigned_host_club_id" TEXT,
    "assigned_host_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_registration_forms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_registration_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_form_submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_email_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "variables" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ride_participants_status_idx" ON "ride_participants"("status");

-- CreateIndex
CREATE INDEX "ride_participants_district_number_idx" ON "ride_participants"("district_number");

-- CreateIndex
CREATE INDEX "ride_participants_email_idx" ON "ride_participants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ride_registration_forms_slug_key" ON "ride_registration_forms"("slug");

-- CreateIndex
CREATE INDEX "ride_form_submissions_form_id_idx" ON "ride_form_submissions"("form_id");

-- CreateIndex
CREATE INDEX "ride_form_submissions_participant_id_idx" ON "ride_form_submissions"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ride_email_templates_slug_key" ON "ride_email_templates"("slug");

-- AddForeignKey
ALTER TABLE "ride_participants" ADD CONSTRAINT "ride_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_participants" ADD CONSTRAINT "ride_participants_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_form_submissions" ADD CONSTRAINT "ride_form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "ride_registration_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_form_submissions" ADD CONSTRAINT "ride_form_submissions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "ride_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
