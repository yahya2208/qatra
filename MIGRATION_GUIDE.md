# Qatra — Database Migration Guide

## From: Original schema.sql
## To: Hardened schema.sql

---

## 1. Pre-Migration Checklist
- [ ] Backup current database
- [ ] Review all changes in schema.sql
- [ ] Test migration on staging environment
- [ ] Coordinate with team for downtime window

## 2. Migration Steps

### Step 1: Backup
```sql
-- In Supabase SQL Editor
-- Export full database backup
```

### Step 2: Drop Existing Policies
```sql
-- Remove old RLS policies
DO $$ BEGIN
  -- Drop all existing policies on target tables
  DROP POLICY IF EXISTS "Public read donors" ON donors;
  DROP POLICY IF EXISTS "Public insert donors" ON donors;
  DROP POLICY IF EXISTS "Public read blood_requests" ON blood_requests;
  DROP POLICY IF EXISTS "Public insert blood_requests" ON blood_requests;
  DROP POLICY IF EXISTS "Public insert feedback" ON feedback;
  DROP POLICY IF EXISTS "Public read ratings" ON ratings;
  DROP POLICY IF EXISTS "Public insert ratings" ON ratings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
```

### Step 3: Add New Columns
```sql
-- Add facebook_url to donors if not exists
ALTER TABLE donors ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Add updated_at to donors if not exists
ALTER TABLE donors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add updated_at to blood_requests if not exists
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

### Step 4: Add Constraints
```sql
-- Phone validation
ALTER TABLE donors ADD CONSTRAINT donors_phone_check
  CHECK (phone ~ '^0[5-7][0-9]{8}$');

-- Name length
ALTER TABLE donors ADD CONSTRAINT donors_name_check
  CHECK (char_length(trim(full_name)) between 2 and 100);

-- Blood type validation
ALTER TABLE donors ADD CONSTRAINT donors_blood_type_check
  CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));

-- Wilaya ID range
ALTER TABLE donors ADD CONSTRAINT donors_wilaya_check
  CHECK (wilaya_id BETWEEN 1 AND 58);

-- Stars range
ALTER TABLE ratings ADD CONSTRAINT ratings_stars_check
  CHECK (stars BETWEEN 1 AND 5);

-- Comment length
ALTER TABLE ratings ADD CONSTRAINT ratings_comment_check
  CHECK (char_length(comment) <= 1000);

-- Message length
ALTER TABLE feedback ADD CONSTRAINT feedback_message_check
  CHECK (char_length(trim(message)) between 1 and 2000);

-- Urgency validation
ALTER TABLE blood_requests ADD CONSTRAINT blood_requests_urgency_check
  CHECK (urgency IN ('urgent','normal'));

-- Status validation
ALTER TABLE blood_requests ADD CONSTRAINT blood_requests_status_check
  CHECK (status IN ('open','closed','completed'));
```

### Step 5: Add Unique Constraint
```sql
-- Unique phone (if not already)
CREATE UNIQUE INDEX IF NOT EXISTS idx_donors_phone_unique ON donors(phone);
```

### Step 6: Add Performance Indexes
```sql
-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_donors_query
  ON donors(blood_type, wilaya_id, is_available, created_at DESC);

-- Partial indexes
CREATE INDEX IF NOT EXISTS idx_donors_available
  ON donors(created_at DESC)
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_requests_open
  ON blood_requests(created_at DESC)
  WHERE status = 'open';

-- Timestamp indexes
CREATE INDEX IF NOT EXISTS idx_donors_created
  ON donors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_created
  ON blood_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ratings_created
  ON ratings(created_at DESC);
```

### Step 7: Create Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 8: Add Triggers
```sql
CREATE TRIGGER set_donors_updated_at
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Step 9: Create Updated_at Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_donors_updated
  ON donors(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_updated
  ON blood_requests(updated_at DESC);
```

### Step 10: Apply New RLS Policies
```sql
-- Enable RLS (if not already)
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Donors: Public read
CREATE POLICY "donors_select_public"
  ON donors FOR SELECT
  USING (true);

-- Donors: Authenticated insert
CREATE POLICY "donors_insert_auth"
  ON donors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Donors: Delete by phone match (for account deletion)
CREATE POLICY "donors_delete_by_phone"
  ON donors FOR DELETE
  USING (true);  -- Phone verification done in application layer

-- Blood_requests: Public read
CREATE POLICY "blood_requests_select_public"
  ON blood_requests FOR SELECT
  USING (true);

-- Blood_requests: Authenticated insert
CREATE POLICY "blood_requests_insert_auth"
  ON blood_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Feedback: Insert only (no public read)
CREATE POLICY "feedback_insert_only"
  ON feedback FOR INSERT
  WITH CHECK (true);

-- Ratings: Public read
CREATE POLICY "ratings_select_public"
  ON ratings FOR SELECT
  USING (true);

-- Ratings: Authenticated insert
CREATE POLICY "ratings_insert_auth"
  ON ratings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### Step 11: Verify Migration
```sql
-- Test queries
SELECT count(*) FROM donors;
SELECT count(*) FROM blood_requests;
SELECT count(*) FROM ratings;

-- Verify constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'donors'::regclass;

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'donors';
```

## 3. Rollback Plan
If issues occur:
1. Restore from backup
2. Revert to previous schema.sql version
3. Notify users of temporary rollback

## 4. Post-Migration
- [ ] Update frontend to use new column names (if any)
- [ ] Test all CRUD operations
- [ ] Verify RLS policies work correctly
- [ ] Monitor error logs for 24 hours
- [ ] Update documentation
