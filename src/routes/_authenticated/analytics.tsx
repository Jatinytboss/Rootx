import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Gauge, LineChart, TriangleAlert } from "lucide-react";
import { PageShell, Panel } from "@/components/uptimer/PageShell";
import { formatInterval } from "@/components/uptimer/intervals";
import { analyticsOverview } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — rootX UPTIMER" },
      {
        name: "description",
        content:
          "Response time, uptime percentage and failure analytics for every website you monitor with rootX UPTIMER.",
      },
      { property: "og:title", content: "Analytics — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Response time and uptime analytics for all of your monitors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

function Sparkline({ points }: { points: { value: number; status: string }[] }) {
  if (points.length === 0) {
    return <div className="text-[10px] text-muted-foreground">No checks yet</div>;
  }
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {points.map((point, index) => (
        <span
          key={index}
          style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
          className={cn(
            "w-full max-w-[8px] rounded-sm",
            point.status === "up" ? "bg-primary/70" : "bg-destructive/80",
          )}
        />
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { user } = Route.useRouteContext();
  const fetchAnalytics = useServerFn(analyticsOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => fetchAnalytics(),
    refetchInterval: 30_000,
  });

  const totals = data?.totals;

  return (
    <PageShell
      email={user.email ?? "you@rootx.dev"}
      kicker="rootX UPTIMER"
      title="Analytics"
      description="Performance of every monitor, built from your recorded checks."
    >
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Checks recorded",
            value: totals?.checks ?? 0,
            meta: `${totals?.checks24h ?? 0} in the last 24h`,
            icon: Activity,
            tone: "text-primary",
          },
          {
            label: "Average response",
            value: totals?.avgResponse ? `${totals.avgResponse} ms` : "—",
            meta: "Across all monitors",
            icon: Gauge,
            tone: "text-success",
          },
          {
            label: "Uptime",
            value: totals?.uptimePercent === null || totals === undefined ? "—" : `${totals.uptimePercent}%`,
            meta: "Successful checks share",
            icon: LineChart,
            tone: "text-warning",
          },
          {
            label: "Failed checks",
            value: totals?.failures ?? 0,
            meta: "Down responses recorded",
            icon: TriangleAlert,
            tone: "text-destructive",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4" data-reveal>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted-foreground uppercase">
                {card.label}
              </span>
              <card.icon className={cn("size-4", card.tone)} />
            </div>
            <div className="mt-3 text-2xl font-extrabold">{card.value}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{card.meta}</div>
          </div>
        ))}
      </section>

      <Panel title="Per monitor performance" sub="Response time trend from the latest checks">
        {isLoading && <p className="p-5 text-xs text-muted-foreground">Loading analytics…</p>}
        {!isLoading && (data?.perMonitor.length ?? 0) === 0 && (
          <p className="p-6 text-xs text-muted-foreground">
            Add a monitor first — analytics appear as soon as checks start.
          </p>
        )}
        <ul className="divide-y divide-border">
          {(data?.perMonitor ?? []).map((item) => (
            <li key={item.monitor.id} className="grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr_1fr] sm:items-center">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{item.monitor.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{item.monitor.url}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {formatInterval(item.monitor.interval_seconds)} · {item.checks} checks
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Uptime", value: item.uptimePercent === null ? "—" : `${item.uptimePercent}%` },
                  { label: "Avg", value: item.avgResponse ? `${item.avgResponse} ms` : "—" },
                  { label: "Fails", value: item.failures },
                ].map((cell) => (
                  <div key={cell.label} className="rounded-xl border border-border bg-surface p-2">
                    <div className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                      {cell.label}
                    </div>
                    <div className="mt-1 text-xs font-extrabold">{cell.value}</div>
                  </div>
                ))}
              </div>
              <Sparkline points={item.trend} />
            </li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  );
}
