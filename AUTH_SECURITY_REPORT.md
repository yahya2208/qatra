# Auth Security Report — Qatra

## Summary

Full authentication and authorization system implemented using Supabase Auth with email/password, row-level security, RBAC, audit logging, and soft delete.

## Threat Mitigations

| Threat | Mitigation | Status |
|--------|------------|--------|
| Unauthorized access | Supabase Auth (email+password) | ✅ |
| Cross-user data access | RLS on `auth.uid()` | ✅ |
| Privilege escalation | RBAC in DB (visitor/donor/moderator/admin) | ✅ |
| Data tampering | RLS UPDATE/DELETE policies | ✅ |
| Credential stuffing | Client-side rate limiting (5min cooldown) | ✅ |
| Brute force | Supabase built-in rate limiting | ✅ |
| Session hijacking | Supabase JWT + refresh tokens | ✅ |
| Data exfiltration | RLS + no service_role in frontend | ✅ |
| XSS via innerHTML | All DOM operations use DOM API | ✅ |
| Missing audit trail | audit_logs table for sensitive ops | ✅ |
| Hard delete | Soft delete only (deleted_at) | ✅ |
| Email enumeration | Generic error messages | ✅ |
| Weak passwords | 8+ chars, 2+ complexity requirements | ✅ |
| Missing consent | 3 mandatory consent checkboxes | ✅ |

## Security Controls

### Authentication
- Email + password via Supabase Auth
- Email verification required before account activation
- Password reset via email link
- Session persistence with auto-refresh
- No phone auth (email only as login credential)

### Authorization (RBAC)
- **Visitor**: Browse donors, view directory
- **Donor**: CRUD own records, rate, give feedback
- **Moderator**: View audit logs, manage donors
- **Admin**: Full access, role management, system config

### Row-Level Security
- All tables have RLS enabled
- SELECT policies: public tables visible to all, private tables (audit_logs, feedback) restricted
- INSERT/UPDATE/DELETE: bound to `auth.uid()` match
- Security definer functions for: profile creation, audit logging, activation

### Data Protection
- UUID primary keys (no sequential IDs)
- Phone number format validation (0[5-7]XXXXXXXX)
- Input sanitization (name: 2-100 chars, no HTML)
- No service_role key in frontend
- CSP meta tag restricting sources
- No innerHTML usage (DOM API only)
- No inline onclick handlers (addEventListener only)

### Audit Logging
- Table: `audit_logs` (immutable — no UPDATE/DELETE policies)
- Events: LOGIN, LOGOUT, REGISTER, UPDATE, DELETE, SOFT_DELETE, PASSWORD_RESET, EMAIL_CHANGE, FAILED_LOGIN, RLS_DENIED, ROLE_CHANGE, STATUS_CHANGE
- Includes: user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent

### Soft Delete
- All sensitive tables support `deleted_at` timestamp
- Public queries filter: `WHERE deleted_at IS NULL`
- Data retained 30 days per RETENTION_POLICY.md
- Hard delete by admin only via SQL

## Known Limitations (GitHub Pages)

1. **No server-side headers**: CSP via `<meta>` only (no `frame-ancestors`, `X-Frame-Options`)
2. **No Edge Functions**: Rate limiting is client-side only
3. **No custom email templates**: Uses Supabase defaults
4. **No MFA**: Not implemented (future enhancement)
5. **No social login**: Email/password only

## Recommendations

1. **Deploy Cloudflare Worker** for server-side rate limiting
2. **Enable Supabase MFA** for admin accounts
3. **Custom email templates** for branding
4. **Content Security Policy** upgrade to server headers (requires non-GitHub Pages hosting)
5. **Regular RLS audit** — review policies quarterly
6. **Database backups** — automated daily per BACKUP_POLICY.md
