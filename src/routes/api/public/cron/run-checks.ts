import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron sweep: checks every active monitor whose interval has elapsed.
 * Call it on a schedule so monitoring keeps running even when nobody has the
 * dashboard open.
 */
export const Route = createFileRoute("/api/public/cron/run-checks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MONITOR_CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 500 });

        const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (token !== secret) return new Response("Unauthorized", { status: 401 });

        const { collections } = await import("@/lib/mongo.server");
        const { performChecks, isDue } = await import("@/lib/monitor-check.server");

        try {
          const { monitors } = await collections();
          const docs = await monitors.find({ is_active: true }).limit(500).toArray();

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
            .slice(0, 100)
            .map((monitor) => ({
              id: monitor._id.toHexString(),
              url: monitor.url,
              user_id: monitor.user_id,
            }));

          const result = await performChecks(due);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Sweep failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
