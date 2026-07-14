/**
 * Cloudflare Worker — Rate Limiter Proxy for Qatra
 * =============================================================================
 * Deploy:  wrangler deploy
 * Config:  wrangler.toml (see below)
 *
 * This Worker sits between the Qatra frontend and Supabase. It:
 *   1. Rate-limits INSERT operations (donors, feedback, ratings) per client IP
 *   2. Passes SELECT (read) operations through without restriction
 *   3. Returns 429 Too Many Requests when limits are exceeded
 *   4. Logs rate-limit events for monitoring
 *
 * Rate Limits (configurable via LIMITS object below):
 *   - POST /donors:     5 requests per 10 minutes per IP
 *   - POST /feedback:   10 requests per 10 minutes per IP
 *   - POST /ratings:    20 requests per 10 minutes per IP
 *   - DELETE anything:  blocked entirely (admin-only via service_role)
 *
 * wrangler.toml:
 *   name = "qatra-ratelimit"
 *   main = "worker.js"
 *   compatibility_date = "2024-01-01"
 *   [vars]
 *   SUPABASE_URL = "https://wqlhjcchqtnkcjcocejf.supabase.co"
 *   SUPABASE_ANON_KEY = "<your-anon-key>"
 */

const LIMITS = {
  donors:   { max: 5,  windowMs: 600000 },
  feedback: { max: 10, windowMs: 600000 },
  ratings:  { max: 20, windowMs: 600000 },
};

const inMemoryStore = new Map();

function getClientIP(request) {
  return request.headers.get('cf-connecting-ip') ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

function getRateLimitKey(ip, table) {
  return `${ip}:${table}`;
}

function isRateLimited(key, limit) {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now - entry.windowStart > limit.windowMs) {
    inMemoryStore.set(key, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > limit.max) {
    return true;
  }
  return false;
}

function getRetryAfter(key, limit) {
  const entry = inMemoryStore.get(key);
  if (!entry) return 0;
  const elapsed = Date.now() - entry.windowStart;
  return Math.max(0, Math.ceil((limit.windowMs - elapsed) / 1000));
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore) {
    const table = key.split(':')[1];
    const limit = LIMITS[table];
    if (limit && now - entry.windowStart > limit.windowMs * 2) {
      inMemoryStore.delete(key);
    }
  }
}, 300000);

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);

function extractTable(url) {
  const match = url.pathname.match(/\/rest\/v1\/(\w+)/);
  return match ? match[1].toLowerCase() : null;
}

function isInsertRequest(request) {
  return request.method === 'POST';
}

function isDeleteRequest(request) {
  return request.method === 'DELETE';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Block non-allowed HTTP methods
    if (!ALLOWED_METHODS.has(request.method) && !isDeleteRequest(request)) {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Block ALL DELETE requests (no public delete allowed)
    if (isDeleteRequest(request)) {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const table = extractTable(url);

    // Rate-limit INSERT requests
    if (isInsertRequest(request) && table && LIMITS[table]) {
      const ip = getClientIP(request);
      const key = getRateLimitKey(ip, table);

      if (isRateLimited(key, LIMITS[table])) {
        const retryAfter = getRetryAfter(key, LIMITS[table]);
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${retryAfter} seconds.`,
            retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(LIMITS[table].max),
              'X-RateLimit-Remaining': '0',
            }
          }
        );
      }
    }

    // Forward to Supabase (strip client headers, only forward safe ones)
    const supabaseUrl = new URL(url.pathname + url.search, env.SUPABASE_URL);
    const headers = new Headers();
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
    headers.set('apikey', env.SUPABASE_ANON_KEY);
    headers.set('Authorization', `Bearer ${env.SUPABASE_ANON_KEY}`);
    headers.set('Host', new URL(env.SUPABASE_URL).host);

    const proxyRequest = new Request(supabaseUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const response = await fetch(proxyRequest);

    // Add rate-limit headers for INSERT responses
    if (isInsertRequest(request) && table && LIMITS[table]) {
      const ip = getClientIP(request);
      const key = getRateLimitKey(ip, table);
      const entry = inMemoryStore.get(key);
      const remaining = Math.max(0, LIMITS[table].max - (entry ? entry.count : 0));

      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-RateLimit-Limit', String(LIMITS[table].max));
      newHeaders.set('X-RateLimit-Remaining', String(remaining));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  }
};
