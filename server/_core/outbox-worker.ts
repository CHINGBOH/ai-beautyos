/**
 * Outbox delivery worker (at-least-once outbound messaging).
 *
 * Producers (chat handover notifications, wework replies, xhs comments,
 * webhook fan-out) INSERT a row into `outbox` in the same transaction as
 * the business change. This worker drains rows where
 *   status IN ('pending','retry') AND not_before <= now()
 * and dispatches each via a channel-specific sender.
 *
 * Channels are pluggable: register a sender with `registerOutboxSender`.
 * Unknown channels are left as 'pending' and logged once per row.
 *
 * Failure handling:
 *   - exponential backoff: not_before = now() + min(2^attempts, 1800) sec
 *   - after 8 attempts, status -> 'failed', last_error captured.
 *   - success -> status='sent', sent_at=now().
 *
 * The worker is in-process for now; will move out when notifications
 * become a separate service.
 */

import { eq, sql, and, or, lt, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { outbox } from "../../drizzle/schema-agent";
import { logger } from "./logger";

const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_MS ?? 2000);
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH ?? 20);
const MAX_ATTEMPTS = 8;

export interface OutboxRecord {
  id: bigint;
  tenantId: string;
  channel: string;
  target: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export type OutboxSender = (rec: OutboxRecord) => Promise<void>;

const SENDERS = new Map<string, OutboxSender>();

export function registerOutboxSender(channel: string, sender: OutboxSender): void {
  SENDERS.set(channel, sender);
  logger.info(`[outbox] registered sender for channel=${channel}`);
}

/** Enqueue an outbound message. Producers call this inside their own tx. */
export async function enqueueOutbox(opts: {
  tenantId: string;
  channel: string;
  target: string;
  payload: Record<string, unknown>;
  notBefore?: Date;
}): Promise<bigint | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .insert(outbox)
      .values({
        tenantId: opts.tenantId,
        channel: opts.channel,
        target: opts.target,
        payload: opts.payload,
        notBefore: (opts.notBefore ?? new Date()).toISOString(),
      })
      .returning({ id: outbox.id });
    return rows[0]?.id ?? null;
  } catch (err) {
    logger.warn(`[outbox] enqueue failed: ${(err as Error).message}`);
    return null;
  }
}

let workerStarted = false;
let timer: NodeJS.Timeout | null = null;

export function startOutboxWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  logger.info(
    `[outbox] worker starting (poll=${POLL_INTERVAL_MS}ms, batch=${BATCH_SIZE})`
  );
  const tick = async () => {
    try {
      await drainOnce();
    } catch (err) {
      logger.error(`[outbox] worker tick failed: ${(err as Error).message}`);
    } finally {
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }
  };
  timer = setTimeout(tick, POLL_INTERVAL_MS);
}

export function stopOutboxWorker(): void {
  workerStarted = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

async function drainOnce(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // SELECT ... FOR UPDATE SKIP LOCKED so concurrent workers don't collide.
  const candidates = await db.execute(sql`
    SELECT id, tenant_id, channel, target, payload, attempts
    FROM outbox
    WHERE status IN ('pending','retry')
      AND not_before <= now()
    ORDER BY id ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `);

  const rows = (candidates as any).rows ?? candidates;
  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    const rec: OutboxRecord = {
      id: BigInt(row.id),
      tenantId: row.tenant_id,
      channel: row.channel,
      target: row.target,
      payload: row.payload ?? {},
      attempts: Number(row.attempts ?? 0),
    };
    await dispatch(rec);
  }
}

async function dispatch(rec: OutboxRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const sender = SENDERS.get(rec.channel);
  if (!sender) {
    // Unknown channel — leave as pending but bump not_before so we don't
    // spin. Log once per row.
    logger.warn(
      `[outbox] no sender for channel=${rec.channel} id=${rec.id} target=${rec.target}`
    );
    await db.execute(sql`
      UPDATE outbox
      SET not_before = now() + interval '60 seconds'
      WHERE id = ${rec.id.toString()}::bigint
    `);
    return;
  }

  try {
    await sender(rec);
    await db.execute(sql`
      UPDATE outbox
      SET status='sent', sent_at=now(), last_error=null
      WHERE id = ${rec.id.toString()}::bigint
    `);
    logger.debug(
      `[outbox] sent id=${rec.id} channel=${rec.channel} target=${rec.target}`
    );
  } catch (err) {
    const attempts = rec.attempts + 1;
    const msg = (err as Error).message || String(err);
    if (attempts >= MAX_ATTEMPTS) {
      await db.execute(sql`
        UPDATE outbox
        SET status='failed', attempts=${attempts}, last_error=${msg}
        WHERE id = ${rec.id.toString()}::bigint
      `);
      logger.error(
        `[outbox] permanently failed id=${rec.id} channel=${rec.channel} after ${attempts} attempts: ${msg}`
      );
    } else {
      const backoffSec = Math.min(2 ** attempts, 1800);
      await db.execute(sql`
        UPDATE outbox
        SET status='retry',
            attempts=${attempts},
            last_error=${msg},
            not_before = now() + (${backoffSec} || ' seconds')::interval
        WHERE id = ${rec.id.toString()}::bigint
      `);
      logger.warn(
        `[outbox] retry id=${rec.id} channel=${rec.channel} attempt=${attempts} backoff=${backoffSec}s: ${msg}`
      );
    }
  }
}

/* ─────────────────── stock channel senders ─────────────────── */

/**
 * No-op channel: marks every message as sent. Useful for tests and
 * dry-run deployments. Producers can write to `channel='noop'` to
 * exercise the worker without any external side effect.
 */
registerOutboxSender("noop", async () => {
  /* succeed silently */
});

/**
 * Webhook sender. payload.url + payload.body required. Times out at 10s.
 * Non-2xx responses raise so the worker retries with backoff.
 */
registerOutboxSender("webhook", async (rec) => {
  const url = (rec.payload as any).url ?? rec.target;
  const body = (rec.payload as any).body ?? rec.payload;
  const headers = (rec.payload as any).headers ?? {
    "content-type": "application/json",
  };
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), 10_000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) {
      throw new Error(`webhook ${url} -> HTTP ${r.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
});
