# Qatra — Rate Limiting Documentation

---

## 1. Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Browser     │────▶│  Cloudflare      │────▶│  Supabase    │
│               │     │  Worker          │     │              │
│  Client-side  │     │  Server-side     │     │  RLS only    │
│  cooldowns    │     │  per-IP limits   │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
```

## 2. Client-Side Rate Limiting

### Implementation
```javascript
const COOLDOWNS = {
  register: 5 * 60 * 1000,   // 5 minutes
  feedback: 1 * 60 * 1000,   // 1 minute
  rating:   1 * 60 * 1000    // 1 minute
};

// In-memory timestamps (resets on page reload)
const actions = {};

function checkCooldown(action) {
  if (!actions[action]) return true;
  return Date.now() - actions[action] >= COOLDOWNS[action];
}

function markAction(action) {
  actions[action] = Date.now();
}
```

### Behavior
- Resets on page reload (client-side only)
- Blocks form submission + shows Arabic error message
- Provides visual feedback: "Please wait X minutes before..."

## 3. Server-Side Rate Limiting (Cloudflare Worker)

### Implementation: `worker.js`

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/donors` POST | 5 requests | 10 minutes |
| `/feedback` POST | 10 requests | 10 minutes |
| `/ratings` POST | 20 requests | 10 minutes |
| `*` DELETE | Blocked | Permanent |

### Headers Returned

**When allowed:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2026-07-13T14:30:00Z
```

**When blocked:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 180
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-07-13T14:30:00Z
```

### Storage
- In-memory Map with automatic cleanup
- Key: IP address (via `cf-connecting-ip` header)
- Cleanup: removes expired entries every 100 requests

## 4. Deployment

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Set secrets
echo "YOUR_SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY

# Deploy
wrangler deploy

# Output: https://qatra-proxy.YOUR_SUBDOMAIN.workers.dev
```

### Frontend Integration
After deploying the Worker, update the Supabase URL in `index.html`:
```javascript
const SUPABASE_URL = 'https://qatra-proxy.YOUR_SUBDOMAIN.workers.dev';
```

Or configure in `wrangler.toml` as a route for your custom domain.

## 5. Limitations
- **Client-side:** Easily bypassed (disabled JS, incognito, page reload)
- **Worker:** In-memory only (resets on Worker restart, no cross-instance sharing)
- **GitHub Pages:** Cannot add custom headers

### Recommended Enhancements
1. Use Cloudflare KV for persistent rate limit storage
2. Add Supabase Auth + per-user rate limits
3. Implement exponential backoff in frontend
4. Add CAPTCHA for repeated violations
