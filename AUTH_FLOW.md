# Auth Flow — Qatra

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  index.html (Vanilla JS)                    │
│  ├─ Auth Module (signUp/signIn/signOut)     │
│  ├─ Auth UI (login/register/account modals) │
│  └─ Auth State (onAuthStateChange)          │
└──────────────────┬──────────────────────────┘
                   │ Supabase JS v2 (anon key)
                   ▼
┌─────────────────────────────────────────────┐
│              Supabase Auth                   │
│  auth.users (managed by Supabase)           │
│  ├─ Email/password authentication           │
│  ├─ Email verification                      │
│  ├─ Password reset                          │
│  └─ JWT tokens (access + refresh)           │
└──────────────────┬──────────────────────────┘
                   │ RLS policies (auth.uid())
                   ▼
┌─────────────────────────────────────────────┐
│              Supabase DB                     │
│  profiles (auth.uid() → user_id)            │
│  donors (user_id → profiles.user_id)        │
│  audit_logs (user_id → auth.uid())          │
└─────────────────────────────────────────────┘
```

## Registration Flow

```
1. User opens register modal
2. Fills: email, password, name, phone, blood type, wilaya, commune
3. Checks consent boxes (privacy, terms, public display)
4. Clicks "Register"
5. Client validates:
   ├─ Email format
   ├─ Password strength (8+ chars, 2+ of: upper, lower, digit, symbol)
   ├─ Name (2-100 chars, no <>\"'`)
   ├─ Phone (0[5-7]XXXXXXXX)
   ├─ Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-)
   ├─ Facebook URL (optional, must be facebook.com/fb.com)
   ├─ Last donation date (not in future)
   └─ Cooldown (5 min between registrations)
6. auth.signUp(email, password, { name, phone })
7. Supabase creates auth.users row
8. Trigger creates profiles row (PENDING)
9. insertDonor() creates donors row (user_id linked)
10. Supabase sends verification email
11. UI shows "Check your email" message
12. User clicks link → email confirmed → ACTIVE
```

## Login Flow

```
1. User clicks Login button
2. Enters email + password
3. Client calls auth.signIn(email, password)
4. Supabase validates credentials
5. Returns JWT session
6. onAuthStateChange fires:
   ├─ currentUser = session.user
   ├─ loadProfile() fetches profiles row
   └─ updateAuthUI() shows user info
7. Modal closes, user sees their name in header
```

## Logout Flow

```
1. User clicks account dropdown → Logout
2. auth.signOut() called
3. Supabase clears session
4. onAuthStateChange fires with null session
5. currentUser = null, currentProfile = null
6. updateAuthUI() shows Login button
```

## Password Reset Flow

```
1. User clicks "Forgot password?" on login modal
2. Enters email
3. auth.resetPasswordForEmail(email, { redirectTo })
4. Supabase sends reset email
5. User clicks link → Supabase validates token
6. User enters new password
7. auth.updateUser({ password }) called
8. Password updated, session refreshed
```

## Account Deletion Flow

```
1. User opens account modal
2. Clicks "Delete my account permanently"
3. Confirms via dialog
4. authSoftDelete() executes:
   ├─ donors: set deleted_at, is_available=false
   ├─ profiles: set deleted_at, status='DELETED'
   └─ auth.signOut()
5. RLS hides deleted records from public queries
6. Data retained 30 days then hard-deleted
```

## Auth State Management

```javascript
// Reactive auth state via Supabase listener
sb.auth.onAuthStateChange(async (event, session) => {
  currentUser = session ? session.user : null;
  if (currentUser) {
    await loadProfile();  // Fetch from profiles table
  } else {
    currentProfile = null;
  }
  updateAuthUI();  // Update header, buttons, dropdowns
});

// Events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, PASSWORD_RECOVERY
```

## RLS Policy Summary

| Table | Policy | Condition |
|-------|--------|-----------|
| profiles | SELECT | `auth.uid() = user_id` |
| profiles | UPDATE | `auth.uid() = user_id` |
| donors | SELECT | `deleted_at IS NULL` (public) |
| donors | INSERT | `auth.uid() = user_id` |
| donors | UPDATE | `auth.uid() = user_id` |
| donors | DELETE | `auth.uid() = user_id` |
| audit_logs | SELECT | `role IN ('admin','moderator')` |
| audit_logs | INSERT | Via `log_audit_event()` (security definer) |
| blood_requests | SELECT | `deleted_at IS NULL` (public) |
| blood_requests | INSERT | `auth.uid() = user_id OR user_id IS NULL` |
| feedback | INSERT | `auth.uid() = user_id OR user_id IS NULL` |
| ratings | SELECT | `deleted_at IS NULL` (public) |
| ratings | INSERT | `auth.uid() = user_id OR user_id IS NULL` |
