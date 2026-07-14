# Qatra Security Fixes — Detailed Change Log

## File: index.html

### 1. CSP Meta Tag (Line 6)
**Vulnerability:** No Content Security Policy
**Fix:** Added `<meta http-equiv="Content-Security-Policy">` with:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src https://fonts.gstatic.com`
- `img-src 'self' data: blob:`
- `connect-src https://wqlhjcchqtnkcjcocejf.supabase.co`
- `frame-ancestors 'none'`
- `base-uri 'self'`
- `form-action 'self'`

### 2. Security Meta Tags (Lines 7-9)
**Fix:** Added:
- `<meta name="referrer" content="no-referrer">`
- `<meta name="robots" content="index, follow">`
- `<meta http-equiv="X-Content-Type-Options" content="nosniff">`
- `<meta http-equiv="X-Frame-Options" content="DENY">`
- `<meta name="theme-color" content="#05060B">`

### 3. SRI Hash on Supabase CDN (Line 14)
**Fix:** Added `integrity` and `crossorigin="anonymous"` attributes to Supabase script tag

### 4. Input Validation Attributes (Lines 512-515)
**Fix:** Added to form inputs:
- `maxlength="100"` + `required` on name
- `pattern="^0[5-7][0-9]{8}$"` + `maxlength="10"` + `required` on phone
- `maxlength="255"` on Facebook URL
- `maxlength="2000"` on suggestion textarea
- `maxlength="1000"` on review comment textarea

### 5. select('*') Replacement (Lines 1130, 1533)
**Fix:** 
- Donors: `select('id,full_name,phone,blood_type,wilaya_id,commune_id,facebook_url,last_donation_date').limit(500)`
- Ratings: `select('id,stars,comment,created_at').limit(50)`

### 6. renderResults DOM Rewrite (Lines 1230-1340)
**Vulnerability:** innerHTML with unescaped phone in href attributes
**Fix:** Complete rewrite using DOM API:
- `document.createElement()` for all elements
- `.textContent` for all text values
- `.setAttribute('href', ...)` for all links
- Regex validation before creating tel: and wa.me links
- Facebook URL domain whitelist validation

### 7. renderRatingSummary DOM Rewrite (Lines 1524-1544)
**Fix:** Replaced innerHTML with DOM construction using createElement/textContent

### 8. renderReviews DOM Rewrite (Lines 1546-1578)
**Fix:** Replaced innerHTML with DOM construction; user comments rendered via `.textContent` (safe by default)

### 9. Input Validation Functions (Lines 1430-1440)
**Fix:** Added:
- `validateName(s)` — 2-100 chars, no HTML special chars
- `validatePhone(s)` — `^0[5-7]\d{8}$` regex
- `validateFacebook(s)` — domain whitelist
- `validateLastDonation(s, never)` — cannot be future date

### 10. Rate Limiting (Lines 1418-1428)
**Fix:** Client-side cooldown system:
- Registration: 5 minutes
- Feedback: 1 minute
- Rating: 1 minute
- `checkCooldown(action)` + `markAction(action)`

### 11. Register Submit Validation Chain (Lines 1442-1495)
**Fix:** Full validation before insert:
1. Required fields check
2. Consent checkbox check
3. Cooldown check
4. Name validation
5. Phone validation
6. Blood type whitelist
7. Facebook URL validation
8. Last donation date validation

### 12. Feedback Submit Rate Limiting (Lines 1507-1520)
**Fix:** Added cooldown + length validation before insert

### 13. Rating Submit Rate Limiting (Lines 1624-1632)
**Fix:** Added cooldown + comment length validation before insert

### 14. printPoster DOM Rewrite (Lines 1856-1881)
**Vulnerability:** `document.write()` with string concatenation
**Fix:** Safe DOM construction: `doc.createElement('html')`, `createElement('img')`, `img.src = dataURL`

### 15. No Inline onclick Handlers
**Fix:** All inline `onclick` attributes removed from HTML; replaced with `addEventListener` in JS

### 16. Account Deletion (Lines 1362-1380)
**Fix:** New feature with phone-based verification, confirmation dialog, Supabase delete

### 17. Pagination (Lines 1303-1330)
**Fix:** 20 items per page with prev/next buttons, page number buttons, auto-reset on filter change

### 18. Privacy Consent (Lines 555-558)
**Fix:** Mandatory consent checkbox on registration form

### 19. Privacy Policy Modal (Lines 706-726)
**Fix:** Full privacy policy modal with data collection notice + delete account link

## File: schema.sql

### 20. CHECK Constraints
Added: phone regex, name length, facebook URL domain, blood_type enum, urgency enum, status enum, stars range, message length, comment length

### 21. UNIQUE Constraint
Added: `idx_donors_phone_unique` on donors.phone

### 22. NOT NULL Constraints
Added: All required columns marked NOT NULL with appropriate defaults

### 23. updated_at Triggers
Added: `update_updated_at()` function with triggers on donors and blood_requests

### 24. RLS Policy Rewrite
- Removed all `USING (true)` / `WITH CHECK (true)` on writable tables
- Donors: public read, insert, delete-by-phone, no update
- Blood_requests: public read, insert, no update/delete
- Feedback: insert-only, no public read
- Ratings: public read, insert, no update/delete

### 25. Performance Indexes
Added: Composite index `idx_donors_query`, partial indexes on available donors and open requests, timestamp indexes

## File: worker.js (New)

### 26. Cloudflare Workers Rate Limiter
- Per-IP rate limiting: donors 5/10min, feedback 10/10min, ratings 20/10min
- DELETE blocked entirely (405)
- Retry-After and X-RateLimit-* headers
- In-memory store with automatic cleanup
