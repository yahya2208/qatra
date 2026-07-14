# Qatra — System Architecture

## Overview
Qatra is a community blood donor directory for Algeria. Single-page application hosted on GitHub Pages with Supabase backend.

## Tech Stack
- **Frontend:** Single `index.html` (~1950 lines), Vanilla JS, CSS3
- **Backend:** Supabase (PostgreSQL + RLS + Realtime)
- **Hosting:** GitHub Pages (static)
- **Rate Limiting:** Cloudflare Workers (optional proxy)
- **Fonts:** Google Fonts (Cairo, Tajawal, Rajdhani, Orbitron)
- **Libraries:** Supabase JS v2 (CDN), qrcode.js (local), communes_compact.js (local)

## Architecture Diagram
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Browser     │────▶│  Cloudflare      │────▶│  Supabase   │
│  index.html  │     │  Worker (opt.)   │     │  PostgreSQL  │
│              │     │  Rate Limiter    │     │  + RLS       │
└─────────────┘     └──────────────────┘     └─────────────┘
      │                                             │
      ├─ CDN: Supabase JS                           ├─ Tables: donors,
      ├─ CDN: Google Fonts                          │  blood_requests,
      ├─ Local: qrcode.js                           │  ratings, feedback,
      └─ Local: communes_compact.js                 │  wilayas, communes
                                                    └─ Indexes: 12
```

## Data Flow
1. **Registration:** User fills form → client validation → Supabase INSERT → donors table
2. **Search:** User selects filters → client-side filter/sort → DOM rendering
3. **Contact:** User clicks Call/WhatsApp → validated href → external app
4. **Rating:** User selects stars → Supabase INSERT → ratings table
5. **Deletion:** User enters phone → Supabase DELETE by phone match

## Security Layers
1. **CSP:** Meta tag restricts script/style/connect sources
2. **SRI:** Integrity check on Supabase CDN script
3. **Client Validation:** Regex + length + domain whitelist
4. **Schema Validation:** CHECK constraints enforce data integrity
5. **RLS:** Row-Level Security on all tables
6. **DOM Safety:** All rendering uses createElement/textContent/setAttribute
7. **Rate Limiting:** Client cooldowns + Worker proxy
8. **Privacy:** Consent checkbox + privacy policy + account deletion

## Deployment
```
GitHub Pages (automatic):
  git push origin main → GitHub Actions → https://yahya2208.github.io/qatra/

Cloudflare Worker (manual):
  cd worker/
  wrangler secret put SUPABASE_ANON_KEY
  wrangler deploy
  → Update SUPABASE_URL in index.html to Worker URL
```

## File Structure
```
qatra/
├── index.html              # Main app (HTML + CSS + JS)
├── schema.sql              # Database schema (run in Supabase SQL Editor)
├── communes_compact.js     # 1541 communes geographic data
├── communes_data.js        # Legacy commune data (unused)
├── seed_communes.sql       # Communes seed SQL
├── libs/
│   └── qrcode.js           # QR code generator (Kazuhiko Arase, MIT)
├── worker.js               # Cloudflare Worker rate limiter
├── wrangler.toml           # Worker deployment config
├── SECURITY_AUDIT.md       # This audit report
├── SECURITY_FIXES.md       # Detailed change log
├── SECURITY_TEST_RESULTS.md# Attack simulation results
├── ARCHITECTURE.md         # This file
├── AUTH_DESIGN.md          # Authentication system design
├── ADMIN_DASHBOARD.md      # Admin dashboard design
├── RATE_LIMITING.md        # Rate limiting documentation
├── PRIVACY_POLICY.md       # Full privacy policy
├── MIGRATION_GUIDE.md      # Database migration instructions
└── CHANGELOG_SECURITY.md   # Security change log
```
