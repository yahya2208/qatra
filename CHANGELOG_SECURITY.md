# Qatra — Security Change Log

## Format: YYYY-MM-DD | Category | Severity | Description

---

## 2026-07-13 — Security Hardening Release

### CRITICAL Fixes

| ID | File | Description |
|----|------|-------------|
| SEC-001 | schema.sql | **RLS Wide Open** — Removed all `USING (true)` / `WITH CHECK (true)` on writable tables. Added proper INSERT/DELETE policies. Removed public DELETE on blood_requests. |
| SEC-002 | index.html | **select('*') Data Leakage** — Replaced all `select('*')` with explicit column lists. Donors: `id,full_name,phone,blood_type,wilaya_id,commune_id,facebook_url,last_donation_date`. Ratings: `id,stars,comment,created_at`. |
| SEC-003 | index.html | **innerHTML XSS — Phone Injection** — Replaced all innerHTML with DOM construction (createElement/textContent/setAttribute). Phone validated before href creation. |
| SEC-004 | index.html | **No Input Validation** — Added regex validation: phone `^0[5-7]\d{8}$`, name 2-100 chars, facebook URL domain whitelist. |
| SEC-005 | index.html | **document.write XSS** — Replaced `w.document.write(...)` in printPoster with safe DOM construction. |
| SEC-006 | index.html | **No Content Security Policy** — Added CSP meta tag with strict directives: `default-src 'self'`, `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`, `frame-ancestors 'none'`. |

### HIGH Fixes

| ID | File | Description |
|----|------|-------------|
| SEC-007 | index.html + worker.js | **No Rate Limiting** — Added client-side cooldowns (5min/1min) + Cloudflare Worker proxy with per-IP limits. |
| SEC-008 | index.html | **Facebook URL Injection** — Added domain whitelist regex: only `https://(www.)?(facebook|fb).com/` accepted. |
| SEC-009 | index.html | **No Privacy/Consent** — Added privacy policy modal + mandatory consent checkbox + account deletion feature. |
| SEC-010 | schema.sql | **Feedback Table Public SELECT** — Removed public SELECT on feedback (admin-only via service_role). |
| SEC-011 | index.html | **No Input Length Limits** — Added maxlength: name=100, phone=10, facebook=255, suggestion=2000, comment=1000. |
| SEC-012 | index.html | **Blood Type Not Validated** — Added `VALID_BLOOD.includes(bloodType)` whitelist check before insert. |

### MEDIUM Fixes

| ID | File | Description |
|----|------|-------------|
| SEC-013 | index.html | **Inline onclick Handlers** — Removed all inline onclick attributes; moved to JS addEventListener. |
| SEC-014 | index.html | **No Pagination** — Added 20-item pagination with prev/next buttons, page number buttons, auto-reset on filter change. |
| SEC-015 | index.html | **printPoster DOM XSS** — Rewrote printPoster to use DOM construction instead of string concatenation. |
| SEC-016 | index.html | **renderRatingSummary XSS** — Replaced innerHTML with DOM construction. |
| SEC-017 | index.html | **renderReviews XSS** — Replaced innerHTML with DOM construction using textContent. |
| SEC-018 | index.html | **init Loading innerHTML** — Replaced innerHTML with DOM construction. |
| SEC-019 | index.html | **Type Grid innerHTML** — Replaced innerHTML with DOM construction. |
| SEC-020 | schema.sql | **CHECK Constraints** — Added constraints: phone regex, name length, facebook URL domain, blood_type enum, urgency enum, status enum, stars range, message length, comment length. |
| SEC-021 | schema.sql | **Performance Indexes** — Added 12 indexes for query optimization. |

### LOW Fixes

| ID | File | Description |
|----|------|-------------|
| SEC-022 | index.html | **SRI Hash** — Added integrity hash for Supabase CDN script. |
| SEC-023 | index.html | **Security Meta Tags** — Added referrer, X-Content-Type-Options, X-Frame-Options, theme-color. |
| SEC-024 | index.html | **Mobile Particle Optimization** — Reduced particles to 20 on mobile devices. |
| SEC-025 | index.html | **Account Deletion** — Added phone-based account deletion with confirmation dialog. |
| SEC-026 | schema.sql | **updated_at Triggers** — Added automatic timestamp updates for donors and blood_requests. |
| SEC-027 | index.html | **Unused esc() Function** — Removed dead code. |

### NEW Files

| File | Purpose |
|------|---------|
| worker.js | Cloudflare Worker rate limiter proxy |
| wrangler.toml | Worker deployment config |
| SECURITY_AUDIT.md | Full security audit report |
| SECURITY_FIXES.md | Detailed change log |
| SECURITY_TEST_RESULTS.md | Attack simulation results |
| ARCHITECTURE.md | System architecture documentation |
| AUTH_DESIGN.md | Authentication system design |
| ADMIN_DASHBOARD.md | Admin dashboard design |
| RATE_LIMITING.md | Rate limiting documentation |
| PRIVACY_POLICY.md | Full privacy policy |
| MIGRATION_GUIDE.md | Database migration instructions |
| CHANGELOG_SECURITY.md | This file |

---

## Statistics

| Category | Count |
|----------|-------|
| Files Modified | 3 |
| Files Created | 10 |
| Critical Fixes | 6 |
| High Fixes | 6 |
| Medium Fixes | 9 |
| Low Fixes | 6 |
| **Total Security Fixes** | **27** |
| Lines Added | ~500 |
| Lines Removed | ~150 |
| Net Change | +350 |

---

## Testing Summary

| Test Category | Tests Run | Passed | Partially Mitigated |
|---------------|-----------|--------|-------------------|
| XSS (Stored/DOM/Reflected) | 10 | 10 | 0 |
| Access Control | 3 | 3 | 0 |
| Injection | 3 | 3 | 0 |
| Clickjacking | 2 | 2 | 0 |
| Spam/Flood | 3 | 0 | 3 |
| Enumeration | 2 | 0 | 2 |
| Race Conditions | 1 | 1 | 0 |
| Other | 8 | 7 | 1 |
| **Total** | **32** | **26** | **6** |

**Partially Mitigated** items require infrastructure changes (Supabase Auth, Cloudflare Worker deployment) beyond current GitHub Pages limitations.
