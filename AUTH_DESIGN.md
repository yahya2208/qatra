# Qatra — Authentication System Design

## Status: NOT IMPLEMENTED — Design Document

---

## 1. Current State
- No authentication system
- All operations anonymous
- Identity proved only by phone number (for account deletion)

## 2. Proposed Architecture

### 2.1 Role Hierarchy
```
visitor (unauthenticated)
  └─ donor (authenticated, phone verified)
       └─ moderator (assigned by admin)
            └─ admin (owner)
```

### 2.2 Supabase Auth Integration

#### Tables
```sql
-- profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'donor' CHECK (role IN ('donor','moderator','admin')),
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Auth Flow
```
1. User enters phone number → Supabase sends OTP via SMS
2. User enters OTP → Supabase verifies → creates auth.users record
3. Database trigger creates profiles record with role='donor'
4. JWT now contains user_id + role
5. RLS policies use auth.uid() and auth.jwt()->>'role'
```

### 2.3 Updated RLS Policies (with Auth)
```sql
-- Donors: public read, authenticated insert (own record only)
CREATE POLICY "donors_insert_auth"
  ON donors FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Donors: owner update
CREATE POLICY "donors_update_owner"
  ON donors FOR UPDATE
  USING (auth.uid() = (
    SELECT p.id FROM profiles p
    JOIN donors d ON d.phone = p.phone
    WHERE p.id = auth.uid()
  ));

-- Donors: owner delete (replaces phone-match delete)
CREATE POLICY "donors_delete_owner"
  ON donors FOR DELETE
  USING (auth.uid() = (
    SELECT p.id FROM profiles p
    JOIN donors d ON d.phone = p.phone
    WHERE p.id = auth.uid()
  ));

-- Blood requests: authenticated insert
CREATE POLICY "blood_requests_insert_auth"
  ON blood_requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Ratings: authenticated insert, owner delete
CREATE POLICY "ratings_insert_auth"
  ON ratings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "ratings_delete_owner"
  ON ratings FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Feedback: authenticated insert
CREATE POLICY "feedback_insert_auth"
  ON feedback FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admin: full access via service_role (never from frontend)
-- Moderator: can read feedback, update blood_request status
CREATE POLICY "moderator_read_feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','admin'))
  );

CREATE POLICY "moderator_update_requests"
  ON blood_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','admin'))
  );
```

### 2.4 Frontend Auth UI
```
┌─────────────────────┐
│  Welcome Screen      │
│  [Phone Input]       │
│  [Send OTP Button]   │
│                      │
│  ── or ──            │
│                      │
│  [Continue without   │
│   account (browse)]  │
└─────────────────────┘

┌─────────────────────┐
│  Enter OTP           │
│  [_][_][_][_][_][_] │
│  [Verify Button]     │
│  [Resend in 30s]     │
└─────────────────────┘

┌─────────────────────┐
│  Profile             │
│  [Edit my info]      │
│  [Delete account]    │
│  [Logout]            │
└─────────────────────┘
```

## 3. Migration Path
1. Enable Phone Auth in Supabase Dashboard
2. Run profiles table migration
3. Add database trigger for auto-profile creation
4. Deploy updated RLS policies
5. Add auth UI to frontend
6. Gradually migrate anonymous users to authenticated accounts
7. Remove phone-match delete (replace with auth-based delete)

## 4. Security Benefits
- Proper identity verification via OTP
- Role-based access control
- Audit logging for admin actions
- Owner-only record modification
- No more phone-as-identity weakness
