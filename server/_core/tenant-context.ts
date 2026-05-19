import type { Request, Response, NextFunction } from "express";

// Tenant context middleware — MVP.
// See docs/architecture/multi-tenant-isolation.md for the contract.
//
// In MVP we do NOT verify bearer tokens. We DO extract the identity
// headers, attach them to req, and reject calls missing required ones
// on routes that opt in. Real auth lands in a follow-up issue but the
// header shape is frozen here.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantContext?: {
        tenantId: string;
        agentId: string;
        userId?: string;
        requestId: string;
        traceId: string;
      };
    }
  }
}

export function tenantContext(opts: { strict?: boolean } = {}) {
  return function (req: Request, res: Response, next: NextFunction) {
    const tenantId = (req.headers["x-tenant-id"] as string) || (opts.strict ? undefined : "default");
    const agentId = (req.headers["x-agent-id"] as string) || (opts.strict ? undefined : "unknown");
    const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const traceId = (req.headers["x-trace-id"] as string) || requestId;
    const userId = (req.headers["x-user-id"] as string) || undefined;

    if (opts.strict && (!tenantId || !agentId)) {
      return res.status(400).json({ error: "missing_header", message: "x-tenant-id and x-agent-id are required" });
    }

    req.tenantContext = { tenantId: tenantId!, agentId: agentId!, userId, requestId, traceId };
    res.setHeader("x-request-id", requestId);
    res.setHeader("x-trace-id", traceId);
    next();
  };
}

// ---------------------------------------------------------------------------
// Rate limit — in-memory token bucket per (tenant, tool).
// Acceptable for MVP single-node. Swap for Redis when we scale out.
// ---------------------------------------------------------------------------

type Bucket = { tokens: number; lastRefill: number };
const BUCKETS = new Map<string, Bucket>();

export function tokenBucketAllow(tenantId: string, tool: string, ratePerMin: number): boolean {
  if (!ratePerMin || ratePerMin <= 0) return true;
  const key = `${tenantId}::${tool}`;
  const burst = Math.max(ratePerMin * 2, ratePerMin);
  const refillPerMs = ratePerMin / 60000;
  const now = Date.now();
  let b = BUCKETS.get(key);
  if (!b) {
    b = { tokens: burst, lastRefill: now };
    BUCKETS.set(key, b);
  }
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(burst, b.tokens + elapsed * refillPerMs);
  b.lastRefill = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}
