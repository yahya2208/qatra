# Account Lifecycle — Qatra

## States

| Status | Description |
|--------|-------------|
| `PENDING` | Account created, email not yet verified |
| `ACTIVE` | Email verified, account fully operational |
| `SUSPENDED` | Account suspended by admin (cannot login) |
| `DELETED` | Soft-deleted by user or admin (data retained 30 days) |

## Lifecycle Flow

```
Registration → PENDING → (email verified) → ACTIVE
                                                    ↓
                                            (user deletes) → DELETED
                                                    ↓
                                            (admin suspends) → SUSPENDED → ACTIVE (reactivated)
```

## Registration

1. User submits email + password + donor info
2. `auth.signUp()` creates auth.users row
3. Trigger `handle_new_user()` creates profiles row (status=PENDING)
4. `insertDonor()` creates donors row (linked via user_id)
5. Supabase sends verification email
6. User clicks link → `email_confirmed_at` set → trigger `activate_profile()` → status=ACTIVE

## Email Verification

- Required before account becomes ACTIVE
- User cannot login until verified (Supabase Enforce setting)
- Resend available via login modal "Resend verification" button
- Supabase auto-expires links after 24h

## Login

- Email + password only (Supabase Auth)
- Session persisted via `persistSession: true`
- `onAuthStateChange` listener updates UI reactively
- Failed login logged to audit_logs

## Profile Update

- Authenticated users can update: display_name, email
- Profile updates require `auth.uid()` match (RLS)
- Changes logged to audit_logs

## Password Reset

- User enters email on login modal
- `auth.resetPasswordForEmail()` sends reset link
- Link redirects to same page with recovery token
- Supabase handles token validation

## Soft Delete

- User clicks "Delete my account" in account modal
- Confirms via dialog
- `authSoftDelete()` executes:
  1. `donors.deleted_at = now()`, `donors.is_available = false`
  2. `profiles.deleted_at = now()`, `profiles.status = 'DELETED'`
  3. `auth.signOut()`
- RLS filters out deleted records from public queries
- Data retained 30 days per RETENTION_POLICY.md
- Admin can hard-delete via SQL after retention period

## Reactivation

- Admin can update `profiles.status = 'ACTIVE'` and clear `deleted_at`
- User can re-register with same email after hard delete (30+ days)

## Role Changes

- Default role: `donor`
- Admin promotes via SQL: `UPDATE profiles SET role = 'admin' WHERE user_id = '...'`
- Moderator can: manage donors, view audit logs
- Admin can: manage users, roles, system settings

## Audit Trail

All lifecycle events logged to `audit_logs`:
- REGISTER, LOGIN, LOGOUT, PASSWORD_RESET, EMAIL_CHANGE
- SOFT_DELETE, ROLE_CHANGE, STATUS_CHANGE, FAILED_LOGIN
