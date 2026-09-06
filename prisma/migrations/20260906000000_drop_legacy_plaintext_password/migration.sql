-- legacy_user_profiles.password held cleartext passwords for 145 real club
-- presidents, and the values followed a pattern derived from the phone numbers
-- published on /public/clubs, so every one was computable from public data.
-- No application code reads this column.
ALTER TABLE "legacy_user_profiles" DROP COLUMN IF EXISTS "password";
