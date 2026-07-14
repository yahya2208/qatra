-- =============================================================================
-- MIGRATION: v2 → v3 (Auth + Ownership)
-- Execute this INSTEAD of schema.sql if tables already exist
-- WARNING: This drops all existing data in donors, blood_requests, ratings, feedback
-- =============================================================================

-- Drop existing tables (order matters due to FK constraints)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS blood_requests CASCADE;
DROP TABLE IF EXISTS donors CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS communes CASCADE;
DROP TABLE IF EXISTS wilayas CASCADE;

-- Drop old triggers/functions
DROP TRIGGER IF EXISTS trg_donors_updated_at ON donors;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS trg_blood_requests_updated_at ON blood_requests;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS activate_profile() CASCADE;
DROP FUNCTION IF EXISTS log_audit_event() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_moderator() CASCADE;

-- Now run the full schema
-- Copy everything from schema.sql and paste here, OR just run schema.sql again after this migration
