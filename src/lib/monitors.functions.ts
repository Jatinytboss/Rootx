import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "./auth-middleware";

export type MonitorStatus = "up" | "down" | "preparing";

export type Monitor = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
  last_status: MonitorStatus;
  last_response_ms: number | null;
  last_status_code: number | null;
  last_error: string | null;
  last_checked_at: string | null;
  created_at: string;
};

export type CheckRow = {
  id: string;
  monitor_id: string;
  status: string;
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
  checked_at: string;
};

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

type AnyMonitorDoc = {
  _id: { toHexString(): string };
  user_id: string;
  name: string;
  url: string;
  interval_seconds: number;
  is_active: boolean;
  last_status: MonitorStatus;
  last_response_ms: number | null;
  last_status_code: number | null;
  last_error: string | null;
  last_checked_at: Date | null;
  created_at: Date;
};

type AnyCheckDoc = {
  _id: { toHexString(): string };
  monitor_id: string;
  status: string;
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
  checked_at: Date;
};

function mapMonitor(doc: AnyMonitorDoc): Monitor {
  return {
    id: doc._id.toHexString(),
    user_id: doc.user_id,
    name: doc.name,
    url: doc.url,
    interval_seconds: doc.interval_seconds,
    is_active: doc.is_active,
    last_status: doc.last_status,
    last_response_ms: doc.last_response_ms ?? null,
    last_status_code: doc.last_status_code ?? null,
    last_error: doc.last_error ?? null,
    last_checked_at: doc.last_checked_at ? new Date(doc.last_checked_at).toISOString() : null,
    created_at: new Date(doc.created_at).toISOString(),
  };
}

function mapCheck(doc: AnyCheckDoc): CheckRow {
  return {
    id: doc._id.toHexString(),
    monitor_id: doc.monitor_id,
    status: doc.status,
    response_ms: doc.response_ms ?? null,
    status_code: doc.status_code ?? null,
    error: doc.error ?? null,
    checked_at: new Date(doc.checked_at).toISOString(),
  };
}

async function userMonitors(userId: string, sort: Record<string, 1 | -1>) {
  const { collections } = await import("./mongo.server");
  const { monitors } = await collections();
  const docs = await monitors.find({ user_id: userId }).sort(sort).toArray();
  return docs.map((doc) => mapMonitor(doc as unknown as AnyMonitorDoc));
}

async function userChecks(userId: string, limit: number, ascending = false) {
  const { collections } = await import("./mongo.server");
  const { checks } = await collections();
  const docs = await checks
    .find({ user_id: userId })
    .sort({ checked_at: ascending ? 1 : -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => mapCheck(doc as unknown as AnyCheckDoc));
}

export const listMonitors = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => userMonitors(context.userId, { created_at: -1 }));

export const recentActivity = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => userChecks(context.userId, 15));

const addSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  url: z
    .string()
    .trim()
    .max(400)
    .refine((value) => /^https?:\/\/.+\..+/i.test(value), "Enter a valid http(s) URL"),
  intervalSeconds: z.number().int().min(15).max(86_400),
});

export const addMonitor = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => addSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { collections, ObjectId } = await import("./mongo.server");
    const { monitors } = await collections();

    const _id = new ObjectId();
    const doc = {
      _id,
      user_id: context.userId,
      name: data.name,
      url: data.url,
      interval_seconds: data.intervalSeconds,
      is_active: true,
      last_status: "preparing" as const,
      last_response_ms: null,
      last_status_code: null,
      last_error: null,
      last_checked_at: null,
      created_at: new Date(),
    };
    await monitors.insertOne(doc);

    // First check immediately so the user sees a real status right away.
    const { performChecks } = await import("./monitor-check.server");
    await performChecks([{ id: _id.toHexString(), url: data.url, user_id: context.userId }]);

    return mapMonitor(doc as unknown as AnyMonitorDoc);
  });

export const deleteMonitor = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: objectId }).parse(input))
  .handler(async ({ data, context }) => {
    const { collections, toObjectId } = await import("./mongo.server");
    const { monitors, checks } = await collections();
    const _id = toObjectId(data.id);
    if (!_id) throw new Error("Monitor not found");
    await monitors.deleteOne({ _id, user_id: context.userId });
    await checks.deleteMany({ monitor_id: data.id, user_id: context.userId });
    return { ok: true };
  });

export const toggleMonitor = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: objectId, isActive: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { collections, toObjectId } = await import("./mongo.server");
    const { monitors } = await collections();
    const _id = toObjectId(data.id);
    if (!_id) throw new Error("Monitor not found");
    await monitors.updateOne(
      { _id, user_id: context.userId },
      { $set: { is_active: data.isActive } },
    );
    return { ok: true };
  });

/**
 * On-demand check for the signed-in user's monitors. The cron sweep keeps
 * monitors checked around the clock; this runs while the dashboard is open
 * (or when Refresh is pressed) for instant feedback.
 */
export const runChecks = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ force: z.boolean().optional(), monitorId: objectId.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { performChecks, isDue } = await import("./monitor-check.server");
    const all = await userMonitors(context.userId, { created_at: -1 });
    const now = Date.now();

    const due = all.filter((monitor) => {
      if (data.monitorId) return monitor.id === data.monitorId;
      if (!monitor.is_active) return false;
      if (data.force) return true;
      return isDue(monitor, now);
    });

    return performChecks(
      due.map((monitor) => ({ id: monitor.id, url: monitor.url, user_id: context.userId })),
    );
  });

export const monitorDetail = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: objectId }).parse(input))
  .handler(async ({ data, context }) => {
    const { collections, toObjectId } = await import("./mongo.server");
    const { monitors, checks } = await collections();
    const _id = toObjectId(data.id);
    if (!_id) return null;

    const doc = await monitors.findOne({ _id, user_id: context.userId });
    if (!doc) return null;

    const rows = await checks
      .find({ monitor_id: data.id, user_id: context.userId })
      .sort({ checked_at: -1 })
      .limit(50)
      .toArray();
    const history = rows.map((row) => mapCheck(row as unknown as AnyCheckDoc));

    const upCount = history.filter((check) => check.status === "up").length;
    const avgResponse = history.length
      ? Math.round(
          history.reduce((sum, check) => sum + (check.response_ms ?? 0), 0) / history.length,
        )
      : null;

    return {
      monitor: mapMonitor(doc as unknown as AnyMonitorDoc),
      history,
      uptimePercent: history.length ? Math.round((upCount / history.length) * 1000) / 10 : null,
      avgResponse,
    };
  });

/** Status-page data: every monitor with its most recent checks. */
export const statusOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const monitors = await userMonitors(context.userId, { name: 1 });
    const history = await userChecks(context.userId, 1200);

    return monitors.map((monitor) => {
      const own = history.filter((check) => check.monitor_id === monitor.id).slice(0, 40);
      const upCount = own.filter((check) => check.status === "up").length;
      return {
        monitor,
        checks: own,
        uptimePercent: own.length ? Math.round((upCount / own.length) * 1000) / 10 : null,
      };
    });
  });

/** Analytics page data: per-monitor performance built from recent checks. */
export const analyticsOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const monitors = await userMonitors(context.userId, { created_at: -1 });
    const history = await userChecks(context.userId, 2000);

    const dayAgo = Date.now() - 86_400_000;
    const last24h = history.filter((check) => new Date(check.checked_at).getTime() >= dayAgo);
    const withMs = history.filter((check) => check.response_ms !== null);

    const perMonitor = monitors.map((monitor) => {
      const own = history.filter((check) => check.monitor_id === monitor.id);
      const up = own.filter((check) => check.status === "up").length;
      const times = own.map((check) => check.response_ms ?? 0).filter((value) => value > 0);
      return {
        monitor,
        checks: own.length,
        uptimePercent: own.length ? Math.round((up / own.length) * 1000) / 10 : null,
        avgResponse: times.length
          ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
          : null,
        fastest: times.length ? Math.min(...times) : null,
        slowest: times.length ? Math.max(...times) : null,
        failures: own.length - up,
        trend: own
          .slice(0, 24)
          .reverse()
          .map((check) => ({ value: check.response_ms ?? 0, status: check.status })),
      };
    });

    const upAll = history.filter((check) => check.status === "up").length;
    return {
      perMonitor,
      totals: {
        monitors: monitors.length,
        checks: history.length,
        checks24h: last24h.length,
        avgResponse: withMs.length
          ? Math.round(
              withMs.reduce((sum, check) => sum + (check.response_ms ?? 0), 0) / withMs.length,
            )
          : null,
        uptimePercent: history.length ? Math.round((upAll / history.length) * 1000) / 10 : null,
        failures: history.length - upAll,
      },
    };
  });

/** Incidents page data: grouped runs of consecutive failed checks. */
export const incidentsList = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const monitors = await userMonitors(context.userId, { created_at: -1 });
    const history = await userChecks(context.userId, 3000, true);
    const names = new Map(monitors.map((monitor) => [monitor.id, monitor]));

    type Incident = {
      id: string;
      monitorId: string;
      monitorName: string;
      monitorUrl: string;
      startedAt: string;
      endedAt: string | null;
      failedChecks: number;
      statusCode: number | null;
      error: string | null;
    };

    const open = new Map<string, Incident>();
    const incidents: Incident[] = [];

    for (const check of history) {
      const monitor = names.get(check.monitor_id);
      if (!monitor) continue;
      const current = open.get(check.monitor_id);
      if (check.status === "down") {
        if (current) {
          current.failedChecks += 1;
          current.statusCode = check.status_code;
          current.error = check.error;
        } else {
          const incident: Incident = {
            id: check.id,
            monitorId: check.monitor_id,
            monitorName: monitor.name,
            monitorUrl: monitor.url,
            startedAt: check.checked_at,
            endedAt: null,
            failedChecks: 1,
            statusCode: check.status_code,
            error: check.error,
          };
          open.set(check.monitor_id, incident);
          incidents.push(incident);
        }
      } else if (current) {
        current.endedAt = check.checked_at;
        open.delete(check.monitor_id);
      }
    }

    return incidents.reverse();
  });
