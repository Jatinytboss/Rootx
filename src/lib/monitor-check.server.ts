import { collections, toObjectId } from "./mongo.server";

export type PingResult = {
  status: "up" | "down";
  responseMs: number;
  statusCode: number | null;
  error: string | null;
};

export type CheckableMonitor = {
  id: string;
  url: string;
  user_id: string;
};

/** rootX check API. Override with CHECK_API_URL if the endpoint ever moves. */
const CHECK_API_URL = () => process.env["CHECK_API_URL"] || "https://api.rootx.run/add";

type CheckApiResponse = {
  success?: boolean;
  url?: string;
  status_code?: number | null;
  response_time?: number | null;
  is_up?: boolean;
  checked_at?: string;
  error?: string | null;
  message?: string;
  status?: string;
};

/**
 * Asks the rootX check API whether a URL is up.
 * Falls back to a direct request from this server if the API is unreachable.
 */
export async function pingUrl(url: string): Promise<PingResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const startedAt = Date.now();

  try {
    const endpoint = `${CHECK_API_URL()}?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "rootX-UPTIMER/1.0" },
    });

    if (!response.ok) throw new Error(`Check API responded ${response.status}`);
    const payload = (await response.json()) as CheckApiResponse;

    const isUp = payload.is_up === true;
    const responseMs =
      typeof payload.response_time === "number" && Number.isFinite(payload.response_time)
        ? Math.max(0, Math.round(payload.response_time * 1000))
        : Date.now() - startedAt;

    return {
      status: isUp ? "up" : "down",
      responseMs,
      statusCode: typeof payload.status_code === "number" ? payload.status_code : null,
      error: isUp ? null : (payload.error ?? payload.message ?? "Website is down"),
    };
  } catch {
    return await directPing(url, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Last-resort check straight from this server, used only if the API call fails. */
async function directPing(url: string, signal: AbortSignal): Promise<PingResult> {
  const startedAt = Date.now();
  const headers = { "user-agent": "rootX-UPTIMER/1.0 (+uptime-monitor)" };
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow", signal, headers });
    if (response.status === 405 || response.status === 501 || response.status === 403) {
      response = await fetch(url, { method: "GET", redirect: "follow", signal, headers });
    }
    return {
      status: response.status < 400 ? "up" : "down",
      responseMs: Date.now() - startedAt,
      statusCode: response.status,
      error: response.status < 400 ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: "down",
      responseMs: Date.now() - startedAt,
      statusCode: null,
      error: error instanceof Error ? error.message : "Connection Error - Cannot reach the website",
    };
  }
}

/**
 * Pings every monitor passed in, stores the result on the monitor document and
 * appends a document to the check history collection in MongoDB.
 */
export async function performChecks(
  monitorsToCheck: CheckableMonitor[],
): Promise<{ checked: number }> {
  if (monitorsToCheck.length === 0) return { checked: 0 };

  const { monitors, checks } = await collections();
  const results = await Promise.all(
    monitorsToCheck.map(async (monitor) => ({ monitor, result: await pingUrl(monitor.url) })),
  );

  await Promise.all(
    results.map(async ({ monitor, result }) => {
      const checkedAt = new Date();
      const _id = toObjectId(monitor.id);
      if (_id) {
        await monitors.updateOne(
          { _id },
          {
            $set: {
              last_status: result.status,
              last_response_ms: result.responseMs,
              last_status_code: result.statusCode,
              last_error: result.error,
              last_checked_at: checkedAt,
            },
          },
        );
      }
      await checks.insertOne({
        monitor_id: monitor.id,
        user_id: monitor.user_id,
        status: result.status,
        response_ms: result.responseMs,
        status_code: result.statusCode,
        error: result.error,
        checked_at: checkedAt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }),
  );

  return { checked: results.length };
}

export function isDue(
  monitor: { interval_seconds: number; last_checked_at: string | Date | null },
  now = Date.now(),
) {
  if (!monitor.last_checked_at) return true;
  const elapsed = now - new Date(monitor.last_checked_at).getTime();
  // small tolerance so a sweep that fires a second early still counts
  return elapsed >= monitor.interval_seconds * 1000 - 2_000;
}
