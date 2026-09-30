/**
 * Always-on monitoring loop.
 *
 * Runs inside the Node server process (Render). Every few seconds it looks for
 * active monitors whose own interval has elapsed and checks them through the
 * rootX check API. It keeps running forever — a monitor stops being checked
 * only when the user pauses or deletes it.
 */
const TICK_MS = Number(process.env["MONITOR_TICK_MS"] || 5_000);

const globalRef = globalThis as typeof globalThis & { __uptimerScheduler?: boolean };

export function startMonitorScheduler(): void {
  if (globalRef.__uptimerScheduler) return;
  if (!process.env["MONGODB_URI"]) return;
  if (process.env["MONITOR_SCHEDULER"] === "off") return;
  globalRef.__uptimerScheduler = true;

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const { collections } = await import("./mongo.server");
      const { performChecks, isDue } = await import("./monitor-check.server");
      const { monitors } = await collections();

      const docs = await monitors.find({ is_active: true }).limit(1000).toArray();
      const now = Date.now();
      const due = docs
        .filter((monitor) =>
          isDue(
            {
              interval_seconds: monitor.interval_seconds,
              last_checked_at: monitor.last_checked_at,
            },
            now,
          ),
        )
        .slice(0, 50)
        .map((monitor) => ({
          id: monitor._id.toHexString(),
          url: monitor.url,
          user_id: monitor.user_id,
        }));

      if (due.length > 0) await performChecks(due);
    } catch (error) {
      console.error("[scheduler] sweep failed:", error);
    } finally {
      running = false;
    }
  };

  try {
    setInterval(tick, TICK_MS);
    void tick();
    console.log(`[scheduler] monitoring loop started (every ${TICK_MS}ms)`);
  } catch (error) {
    globalRef.__uptimerScheduler = false;
    console.error("[scheduler] could not start:", error);
  }
}
