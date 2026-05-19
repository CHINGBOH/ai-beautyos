import type { Express, Request, Response } from "express";
import { monitorEventLoopDelay, type IntervalHistogram } from "node:perf_hooks";

let eventLoopHistogram: IntervalHistogram | null = null;

export function startMetricsCollection(): void {
  if (eventLoopHistogram) return;
  eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
  eventLoopHistogram.enable();
}

interface MetricsSnapshot {
  service: string;
  commit: string;
  startedAt: string;
  uptimeSec: number;
  process: {
    pid: number;
    nodeVersion: string;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  eventLoop: {
    sampleCount: number;
    minMs: number | null;
    meanMs: number | null;
    p50Ms: number | null;
    p95Ms: number | null;
    p99Ms: number | null;
    maxMs: number | null;
  };
}

function nanosToMs(ns: number): number {
  return Math.round((ns / 1e6) * 100) / 100;
}

function bytesToMb(b: number): number {
  return Math.round((b / 1024 / 1024) * 10) / 10;
}

export function collectMetrics(startedAt: Date): MetricsSnapshot {
  const mem = process.memoryUsage();
  const h = eventLoopHistogram;

  const eventLoop = h
    ? {
        sampleCount: h.count,
        minMs: h.count > 0 ? nanosToMs(h.min) : null,
        meanMs: h.count > 0 ? nanosToMs(h.mean) : null,
        p50Ms: h.count > 0 ? nanosToMs(h.percentile(50)) : null,
        p95Ms: h.count > 0 ? nanosToMs(h.percentile(95)) : null,
        p99Ms: h.count > 0 ? nanosToMs(h.percentile(99)) : null,
        maxMs: h.count > 0 ? nanosToMs(h.max) : null,
      }
    : {
        sampleCount: 0,
        minMs: null,
        meanMs: null,
        p50Ms: null,
        p95Ms: null,
        p99Ms: null,
        maxMs: null,
      };

  return {
    service: "ai-beautyos",
    commit: process.env.GIT_COMMIT || "unknown",
    startedAt: startedAt.toISOString(),
    uptimeSec: Math.round(process.uptime()),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      rssMb: bytesToMb(mem.rss),
      heapUsedMb: bytesToMb(mem.heapUsed),
      heapTotalMb: bytesToMb(mem.heapTotal),
      externalMb: bytesToMb(mem.external),
    },
    eventLoop,
  };
}

export function registerMetricsRoute(app: Express, startedAt: Date): void {
  app.get("/metrics", (_req: Request, res: Response) => {
    res.status(200).json(collectMetrics(startedAt));
  });
}
