import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { monitorEventLoopDelay } from 'perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import { Redis } from '@upstash/redis';

// Ngưỡng (ms) của histogram để ước lượng p95 mà không lưu từng request
const LATENCY_BINS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, Infinity];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const MAX_CLIENTS_PER_BUCKET = 5000;
const MAX_ROUTES = 200;
const RECENT_ERRORS = 20;
const REDIS_KEY = 'monitor:state:v1';
const FLUSH_INTERVAL_MS = MINUTE;

export interface Bucket {
  start: number;
  requests: number;
  clientErrors: number; // 4xx
  serverErrors: number; // 5xx
  totalMs: number;
  histogram: number[];
  clients: string[];
}

export interface RouteStats {
  requests: number;
  clientErrors: number;
  serverErrors: number;
  totalMs: number;
  histogram: number[];
  lastSeen: number;
}

export interface RecentError {
  time: number;
  method: string;
  route: string;
  status: number;
  ms: number;
}

export interface PersistedState {
  minutes: Bucket[];
  hours: Bucket[];
  routes: Record<string, RouteStats>;
  statusCodes: Record<string, number>;
  recentErrors: RecentError[];
  totalRequests: number;
  since: number;
}

const emptyHistogram = () => LATENCY_BINS.map(() => 0);

const newBucket = (start: number): Bucket => ({
  start,
  requests: 0,
  clientErrors: 0,
  serverErrors: 0,
  totalMs: 0,
  histogram: emptyHistogram(),
  clients: [],
});

/** Ước lượng percentile từ histogram (trả về cận trên của bin). */
export function percentile(histogram: number[], p: number): number | null {
  const total = histogram.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let seen = 0;
  for (let i = 0; i < histogram.length; i++) {
    seen += histogram[i];
    if (seen / total >= p) {
      return Number.isFinite(LATENCY_BINS[i])
        ? LATENCY_BINS[i]
        : LATENCY_BINS[i - 1];
    }
  }
  return null;
}

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private readonly redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  readonly processStartedAt = Date.now();
  private readonly loopDelay = monitorEventLoopDelay({ resolution: 20 });
  private lastCpu = process.cpuUsage();
  private lastCpuAt = Date.now();
  private flushTimer?: NodeJS.Timeout;

  private minutes: Bucket[] = [];
  private hours: Bucket[] = [];
  private routes = new Map<string, RouteStats>();
  private statusCodes: Record<string, number> = {};
  private recentErrors: RecentError[] = [];
  private totalRequests = 0;
  private since = Date.now();
  private wsConnections = 0;

  async onModuleInit() {
    this.loopDelay.enable();
    await this.restore();
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    this.flushTimer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.flushTimer);
    this.loopDelay.disable();
    await this.flush();
  }

  /** Express middleware: ghi lại mọi request khi response kết thúc. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/monitor')) return next();

      const startedAt = process.hrtime.bigint();
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
        this.record(req, res.statusCode, ms);
      });
      next();
    };
  }

  wsConnected() {
    this.wsConnections++;
  }

  wsDisconnected() {
    this.wsConnections = Math.max(0, this.wsConnections - 1);
  }

  private record(req: Request, status: number, ms: number) {
    const now = Date.now();
    const route = this.routeKey(req);
    const client = this.clientKey(req);
    const bin = LATENCY_BINS.findIndex((limit) => ms <= limit);

    for (const bucket of [
      this.currentBucket(this.minutes, MINUTE, 60, now),
      this.currentBucket(this.hours, HOUR, 24, now),
    ]) {
      bucket.requests++;
      bucket.totalMs += ms;
      bucket.histogram[bin]++;
      if (status >= 500) bucket.serverErrors++;
      else if (status >= 400) bucket.clientErrors++;
      if (
        bucket.clients.length < MAX_CLIENTS_PER_BUCKET &&
        !bucket.clients.includes(client)
      ) {
        bucket.clients.push(client);
      }
    }

    let stats = this.routes.get(route);
    if (!stats) {
      if (this.routes.size >= MAX_ROUTES) return;
      stats = {
        requests: 0,
        clientErrors: 0,
        serverErrors: 0,
        totalMs: 0,
        histogram: emptyHistogram(),
        lastSeen: now,
      };
      this.routes.set(route, stats);
    }
    stats.requests++;
    stats.totalMs += ms;
    stats.histogram[bin]++;
    stats.lastSeen = now;
    if (status >= 500) stats.serverErrors++;
    else if (status >= 400) stats.clientErrors++;

    this.statusCodes[status] = (this.statusCodes[status] ?? 0) + 1;
    this.totalRequests++;

    if (status >= 500) {
      this.recentErrors.unshift({
        time: now,
        method: req.method,
        route,
        status,
        ms: Math.round(ms),
      });
      this.recentErrors.length = Math.min(
        this.recentErrors.length,
        RECENT_ERRORS,
      );
    }
  }

  /** Lấy bucket hiện tại, tạo mới và bỏ bucket cũ nếu đã sang phút/giờ mới. */
  private currentBucket(
    buckets: Bucket[],
    size: number,
    keep: number,
    now: number,
  ) {
    const start = Math.floor(now / size) * size;
    let bucket = buckets[buckets.length - 1];
    if (!bucket || bucket.start !== start) {
      bucket = newBucket(start);
      buckets.push(bucket);
      const cutoff = start - (keep - 1) * size;
      while (buckets.length && buckets[0].start < cutoff) buckets.shift();
    }
    return bucket;
  }

  // Dùng route template (/api/orders/:id) thay vì URL thật để gom nhóm
  private routeKey(req: Request) {
    const route = req.route as { path?: string } | undefined;
    const path = route?.path
      ? `${req.baseUrl}${route.path}`
      : req.path.startsWith('/api/uploadthing')
        ? '/api/uploadthing'
        : '(unmatched)';
    return `${req.method} ${path}`;
  }

  // Hash IP để đếm số client khác nhau mà không lưu IP thật
  private clientKey(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        ?.split(',')[0]
        .trim() ??
      req.ip ??
      'unknown';
    return createHash('sha256').update(ip).digest('hex').slice(0, 12);
  }

  snapshot() {
    const now = Date.now();
    // Đảm bảo có đủ bucket rỗng cho khoảng thời gian không có request
    const series = (buckets: Bucket[], size: number, count: number) => {
      const end = Math.floor(now / size) * size;
      const byStart = new Map(buckets.map((b) => [b.start, b]));
      return Array.from({ length: count }, (_, i) => {
        const start = end - (count - 1 - i) * size;
        const b = byStart.get(start) ?? newBucket(start);
        return {
          start,
          requests: b.requests,
          clientErrors: b.clientErrors,
          serverErrors: b.serverErrors,
          avgMs: b.requests ? Math.round(b.totalMs / b.requests) : null,
          p95Ms: percentile(b.histogram, 0.95),
          clients: b.clients.length,
          histogram: b.histogram,
          clientIds: b.clients,
        };
      });
    };

    const summarize = (items: ReturnType<typeof series>) => {
      const histogram = emptyHistogram();
      const clients = new Set<string>();
      let requests = 0;
      let serverErrors = 0;
      let clientErrors = 0;
      let totalMs = 0;
      for (const b of items) {
        requests += b.requests;
        serverErrors += b.serverErrors;
        clientErrors += b.clientErrors;
        totalMs += (b.avgMs ?? 0) * b.requests;
        b.histogram.forEach((n, i) => (histogram[i] += n));
        b.clientIds.forEach((c) => clients.add(c));
      }
      return {
        requests,
        serverErrors,
        clientErrors,
        uniqueClients: clients.size,
        errorRate: requests ? serverErrors / requests : 0,
        avgMs: requests ? Math.round(totalMs / requests) : null,
        p95Ms: percentile(histogram, 0.95),
      };
    };

    const strip = (items: ReturnType<typeof series>) =>
      items.map((b) => ({
        start: b.start,
        requests: b.requests,
        clientErrors: b.clientErrors,
        serverErrors: b.serverErrors,
        avgMs: b.avgMs,
        p95Ms: b.p95Ms,
        clients: b.clients,
      }));

    const minutes = series(this.minutes, MINUTE, 60);
    const hours = series(this.hours, HOUR, 24);

    const cpu = process.cpuUsage(this.lastCpu);
    const elapsedMs = Date.now() - this.lastCpuAt;
    this.lastCpu = process.cpuUsage();
    this.lastCpuAt = Date.now();
    const memory = process.memoryUsage();

    return {
      generatedAt: now,
      trackingSince: this.since,
      totalRequests: this.totalRequests,
      lastHour: { ...summarize(minutes), series: strip(minutes) },
      last24h: { ...summarize(hours), series: strip(hours) },
      routes: [...this.routes.entries()]
        .map(([route, s]) => ({
          route,
          requests: s.requests,
          serverErrors: s.serverErrors,
          clientErrors: s.clientErrors,
          avgMs: Math.round(s.totalMs / s.requests),
          p95Ms: percentile(s.histogram, 0.95),
          lastSeen: s.lastSeen,
        }))
        .sort((a, b) => b.requests - a.requests),
      statusCodes: this.statusCodes,
      recentErrors: this.recentErrors,
      realtime: { wsConnections: this.wsConnections },
      system: {
        uptimeSec: Math.round((now - this.processStartedAt) / 1000),
        nodeVersion: process.version,
        memoryRssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        cpuPercent: elapsedMs
          ? Math.round(((cpu.user + cpu.system) / 1000 / elapsedMs) * 1000) / 10
          : 0,
        eventLoopP99Ms: Math.round(this.loopDelay.percentile(99) / 1e6),
      },
    };
  }

  // Lưu vào Redis để số liệu không mất khi Render khởi động lại/ngủ
  private async flush() {
    const state: PersistedState = {
      minutes: this.minutes,
      hours: this.hours,
      routes: Object.fromEntries(this.routes),
      statusCodes: this.statusCodes,
      recentErrors: this.recentErrors,
      totalRequests: this.totalRequests,
      since: this.since,
    };
    try {
      await this.redis.set(REDIS_KEY, JSON.stringify(state), {
        ex: 7 * 24 * 3600,
      });
    } catch (error) {
      this.logger.warn(
        `Could not persist metrics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async restore() {
    try {
      const raw = await this.redis.get<string | PersistedState>(REDIS_KEY);
      if (!raw) return;
      const state: PersistedState =
        typeof raw === 'string' ? (JSON.parse(raw) as PersistedState) : raw;
      this.minutes = state.minutes ?? [];
      this.hours = state.hours ?? [];
      this.routes = new Map(Object.entries(state.routes ?? {}));
      this.statusCodes = state.statusCodes ?? {};
      this.recentErrors = state.recentErrors ?? [];
      this.totalRequests = state.totalRequests ?? 0;
      this.since = state.since ?? Date.now();
    } catch (error) {
      this.logger.warn(
        `Could not restore metrics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
