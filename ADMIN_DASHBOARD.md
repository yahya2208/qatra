# Qatra — Admin Dashboard Design

## Status: NOT IMPLEMENTED — Design Document

---

## 1. Overview
Admin dashboard for managing the Qatra platform, monitoring activity, and responding to abuse.

## 2. Access Control
```
Admin:     Full access — CRUD on all tables, user management, analytics
Moderator: Limited access — Read feedback, update request status, view donors
Donor:     Profile management only
```

## 3. Dashboard Screens

### 3.1 Stats Overview
```
┌────────────────────────────────────────────┐
│  Qatra Admin Dashboard                      │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Donors   │ │ Requests│ │ Ratings │      │
│  │  1,247   │ │    89   │ │   342   │      │
│  │ +12 today│ │ +3 today│ │ +5 today│      │
│  └─────────┘ └─────────┘ └─────────┘      │
│                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Wilayas  │ │ Communes│ │ Feedback│      │
│  │    58    │ │  1,541  │ │    47   │      │
│  └─────────┘ └─────────┘ └─────────┘      │
└────────────────────────────────────────────┘
```

### 3.2 Donor Management
```
┌────────────────────────────────────────────┐
│  Donors                    [Export CSV]     │
│  ┌──────────────────────────────────────┐  │
│  │ Search: [________]  Blood: [All ▼]   │  │
│  │ Wilaya: [All ▼]    Available: [All]  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Name          Phone        Blood  Wilaya   │
│  ──────────── ──────────── ────── ──────   │
│  Ahmed B.     0555123456   A+     Algiers  │
│  Fatima H.    0661987654   O-     Oran     │
│  ...                                        │
│                                             │
│  [1] [2] [3] ... [63] [Next →]            │
└────────────────────────────────────────────┘
```

### 3.3 Blood Requests
```
┌────────────────────────────────────────────┐
│  Blood Requests                             │
│  ┌──────────────────────────────────────┐  │
│  │ Status: [All ▼] Urgency: [All ▼]    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Patient       Blood  Wilaya  Urgency  Status│
│  ──────────── ────── ────── ──────── ──────│
│  Karim M.      A+     Blida   urgent   open  │
│  Nadia S.      B+     Constantine normal open │
│  ...                                        │
│                                             │
│  Actions: [Mark Complete] [Archive] [Delete]│
└────────────────────────────────────────────┘
```

### 3.4 Feedback Review
```
┌────────────────────────────────────────────┐
│  Feedback                                   │
│  ──────────────────────────────────────────│
│  "Great app! Please add hospital locations" │
│  2026-07-10 14:32                          │
│  [Archive] [Delete] [Mark as Read]          │
│                                             │
│  "Could you add SMS notifications?"         │
│  2026-07-09 09:15                          │
│  [Archive] [Delete] [Mark as Read]          │
└────────────────────────────────────────────┘
```

### 3.5 Ratings Monitor
```
┌────────────────────────────────────────────┐
│  Ratings                                    │
│  Average: 4.2 ⭐ (342 reviews)             │
│  Distribution:                              │
│  5★ ████████████████░░░░ 68%               │
│  4★ ████░░░░░░░░░░░░░░░ 15%               │
│  3★ ██░░░░░░░░░░░░░░░░░ 8%                │
│  2★ █░░░░░░░░░░░░░░░░░░ 5%                │
│  1★ █░░░░░░░░░░░░░░░░░░ 4%                │
│                                             │
│  Flagged: 3 reviews (possible spam)         │
│  [Review Flagged]                           │
└────────────────────────────────────────────┘
```

### 3.6 Abuse Monitor
```
┌────────────────────────────────────────────┐
│  Abuse Detection                            │
│  ──────────────────────────────────────────│
│  ⚠ Rate limit violations (last 24h): 47   │
│  ⚠ Duplicate registrations: 12             │
│  ⚠ Suspicious feedback patterns: 3         │
│                                             │
│  Top offending IPs:                         │
│  192.168.1.100 — 23 violations             │
│  10.0.0.55 — 18 violations                 │
│  [Block IP] [View History]                  │
└────────────────────────────────────────────┘
```

## 4. API Design (Service Role)

All admin operations use Supabase `service_role` key via Edge Functions or Worker:

```
GET    /api/admin/donors          — List donors (paginated, filtered)
DELETE /api/admin/donors/:id      — Delete donor
PUT    /api/admin/requests/:id    — Update request status
DELETE /api/admin/requests/:id    — Delete request
GET    /api/admin/feedback        — List feedback
DELETE /api/admin/feedback/:id    — Delete feedback
GET    /api/admin/stats           — Dashboard statistics
GET    /api/admin/abuse           — Abuse detection metrics
```

## 5. Security Requirements
- Admin session must be verified against `profiles.role = 'admin'`
- All admin actions logged to `audit_log` table
- `service_role` key NEVER exposed to frontend
- Admin panel behind Supabase Auth with role check
- Session timeout: 30 minutes of inactivity
