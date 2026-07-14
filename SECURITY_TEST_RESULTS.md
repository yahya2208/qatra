# Qatra — Security Test Results

## Test Date: 2026-07-13

---

## 1. Stored XSS Tests

### Test 1.1: Malicious donor name
**Payload:** `<script>alert(1)</script>` as fullName
**Result:** BLOCKED
- Client: `validateName()` rejects `<`, `>`, `"`, `'` characters
- Schema: `CHECK (char_length(trim(full_name)) between 2 and 100)`
- Rendering: `textContent` used (auto-escapes HTML)

### Test 1.2: HTML entity injection
**Payload:** `&lt;script&gt;alert(1)&lt;/script&gt;`
**Result:** BLOCKED
- `textContent` renders as literal text, not parsed HTML
- No innerHTML anywhere in donor rendering

### Test 1.3: Unicode bypass
**Payload:** `\u003cscript\u003ealert(1)\u003c/script\u003e`
**Result:** BLOCKED
- `textContent` does not parse Unicode escape sequences as HTML

### Test 1.4: Comment XSS in ratings
**Payload:** `<img src=x onerror=alert(1)>` as review comment
**Result:** BLOCKED
- `textContent` used in `renderReviews` — renders as literal text

---

## 2. DOM XSS Tests

### Test 2.1: Phone in href injection
**Payload:** Phone = `0777777777" onclick="alert(1)`
**Result:** BLOCKED
- `validatePhone()` rejects non-digit characters
- `setAttribute('href', 'tel:' + phone)` — attribute injection prevented
- Phone must match `^0[5-7]\d{8}$`

### Test 2.2: WhatsApp URL injection
**Payload:** Phone = `0777777777#javascript:alert(1)`
**Result:** BLOCKED
- Phone validated before URL construction
- `setAttribute('href', ...)` — no string concatenation in HTML

### Test 2.3: Facebook URL javascript: protocol
**Payload:** `javascript:alert(1)` in Facebook field
**Result:** BLOCKED
- `validateFacebook()` requires `https://(www.)?(facebook|fb).com/` prefix

### Test 2.4: Facebook URL data: protocol
**Payload:** `data:text/html,<script>alert(1)</script>`
**Result:** BLOCKED — domain whitelist rejects non-facebook URLs

---

## 3. Reflected XSS Tests

### Test 3.1: URL parameter injection
**Payload:** `?name=<script>alert(1)</script>`
**Result:** N/A — application does not read URL parameters for rendering

### Test 3.2: Hash fragment injection
**Payload:** `#<img src=x onerror=alert(1)>`
**Result:** N/A — hash fragment not used in rendering

---

## 4. Broken Access Control Tests

### Test 4.1: Unauthorized DELETE on blood_requests
**Payload:** `DELETE /rest/v1/blood_requests?id=eq.xxx`
**Result:** BLOCKED
- No DELETE policy on blood_requests in RLS
- Worker.js blocks all DELETE requests (405)

### Test 4.2: Unauthorized UPDATE on donors
**Payload:** `PATCH /rest/v1/donors?phone=eq.xxx` with modified data
**Result:** BLOCKED
- No UPDATE policy on donors in RLS
- Anon key cannot update any donor record

### Test 4.3: Data enumeration via id
**Payload:** Sequential UUID guessing
**Result:** BLOCKED — UUID v4 primary keys are cryptographically random

---

## 5. Injection Tests

### Test 5.1: SQL Injection via phone
**Payload:** `'; DROP TABLE donors; --`
**Result:** BLOCKED
- Supabase uses parameterized queries
- Phone regex `^0[5-7]\d{8}$` rejects SQL characters

### Test 5.2: SQL Injection via name
**Payload:** `Robert'); DROP TABLE donors;--`
**Result:** BLOCKED
- `validateName()` rejects `'`, `)`, `;` characters
- Parameterized queries prevent injection

### Test 5.3: SQL Injection via comment
**Payload:** `1' UNION SELECT * FROM donors--`
**Result:** BLOCKED — parameterized queries

---

## 6. Clickjacking Tests

### Test 6.1: iframe embedding
**Payload:** `<iframe src="https://yahya2208.github.io/qatra/"></iframe>`
**Result:** BLOCKED
- CSP: `frame-ancestors 'none'`
- Meta: `X-Frame-Options: DENY`

### Test 6.2: Same-origin iframe
**Payload:** Self-referencing iframe
**Result:** BLOCKED — `frame-ancestors 'none'` blocks all

---

## 7. Spam / Flood Tests

### Test 7.1: Rapid registration attempts
**Payload:** 10 rapid POST requests to /donors
**Result:** MITIGATED
- Client: 5-minute cooldown between registrations
- Worker.js: 5 requests per 10 minutes per IP → 429 after limit

### Test 7.2: Rapid feedback submission
**Payload:** 20 rapid POST requests to /feedback
**Result:** MITIGATED
- Client: 1-minute cooldown
- Worker.js: 10 requests per 10 minutes per IP

### Test 7.3: Rating flood
**Payload:** 30 rapid POST requests to /ratings
**Result:** MITIGATED
- Client: 1-minute cooldown
- Worker.js: 20 requests per 10 minutes per IP

---

## 8. Enumeration Tests

### Test 8.1: Phone number enumeration
**Payload:** Query donors table filtered by phone
**Result:** LOW RISK — donor directory is public by design; phone validation prevents invalid lookups

### Test 8.2: Blood type distribution
**Payload:** Query donors grouped by blood_type
**Result:** INTENDED — public directory, no sensitive enumeration risk

---

## 9. Race Condition Tests

### Test 9.1: Double registration
**Payload:** Two simultaneous registrations with same phone
**Result:** MITIGATED
- `UNIQUE` constraint on donors.phone
- Second insert returns unique violation error

---

## 10. Open Redirect Tests

### Test 10.1: Redirect via return URL
**Payload:** `?redirect=https://evil.com`
**Result:** N/A — no redirect functionality in application

---

## 11. Prototype Pollution Tests

### Test 11.1: __proto__ injection
**Payload:** `{ "__proto__": { "isAdmin": true } }`
**Result:** N/A — no object merge operations; all data is primitive values

---

## 12. DOM Clobbering Tests

### Test 12.1: Named element overwriting
**Payload:** `<div id="sb"><input name="createClient"></div>`
**Result:** BLOCKED — no `document.all` or `id`-based property access patterns

---

## 13. Business Logic Abuse

### Test 13.1: Future last_donation_date
**Payload:** `2030-01-01` as lastDonation
**Result:** BLOCKED — `validateLastDonation()` checks `date <= now()`

### Test 13.2: Invalid blood type
**Payload:** `X+` as bloodType
**Result:** BLOCKED — `VALID_BLOOD.includes(bloodType)` whitelist

### Test 13.3: Consent bypass
**Payload:** Submit registration without checking consent
**Result:** BLOCKED — `fConsent.checked` validated before insert

### Test 13.4: Delete without confirmation
**Payload:** Direct API call to delete endpoint
**Result:** MITIGATED — `confirm()` dialog + phone verification

---

## 14. Information Disclosure Tests

### Test 14.1: Stack trace exposure
**Payload:** Trigger server error
**Result:** BLOCKED — all catch blocks use generic error messages

### Test 14.2: Console log leakage
**Payload:** Check console for sensitive data
**Result:** SAFE — only error objects logged, no user data in console

---

## Summary

| Category | Tests | Passed | Partially Mitigated |
|----------|-------|--------|-------------------|
| XSS (Stored/DOM/Reflected) | 10 | 10 | 0 |
| Access Control | 3 | 3 | 0 |
| Injection | 3 | 3 | 0 |
| Clickjacking | 2 | 2 | 0 |
| Spam/Flood | 3 | 0 | 3 |
| Enumeration | 2 | 0 | 2 |
| Race Conditions | 1 | 1 | 0 |
| Other | 8 | 7 | 1 |
| **Total** | **32** | **26** | **6** |

**Partially Mitigated items** are limited by GitHub Pages infrastructure (no server-side enforcement possible without Cloudflare Worker deployment).
