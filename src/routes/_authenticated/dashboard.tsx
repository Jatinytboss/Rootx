import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Globe,
  Loader2,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { clearSession } from "@/lib/auth-client";
import { Sidebar } from "@/components/uptimer/Sidebar";
import { AddMonitorDialog } from "@/components/uptimer/AddMonitorDialog";
import { MonitorDetailDialog } from "@/components/uptimer/MonitorDetailDialog";
import { formatInterval } from "@/components/uptimer/intervals";
import {
  addMonitor,
  deleteMonitor,
  listMonitors,
  recentActivity,
  runChecks,
  type Monitor,
} from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — rootX UPTIMER" },
      {
        name: "description",
        content:
          "Live uptime dashboard: see which of your websites are up or down, response times and HTTP status codes.",
      },
      { property: "og:title", content: "Dashboard — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Live uptime dashboard with response times, status codes and check history.",
      },
    ],
  }),
  component: DashboardPage,
});

function relativeTime(value: string | null) {
  if (!value) return "not checked yet";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

function StatusPill({ status }: { status: Monitor["last_status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase",
        status === "up" && "bg-success/12 text-success",
        status === "down" && "bg-destructive/12 text-destructive",
        status === "preparing" && "bg-warning/12 text-warning",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "up" && "bg-success",
          status === "down" && "bg-destructive",
          status === "preparing" && "bg-warning",
        )}
      />
      {status === "preparing" ? "checking" : status}
    </span>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();

  const fetchMonitors = useServerFn(listMonitors);
  const fetchActivity = useServerFn(recentActivity);
  const createMonitor = useServerFn(addMonitor);
  const removeMonitor = useServerFn(deleteMonitor);
  const check = useServerFn(runChecks);

  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "up" | "down">("all");

  const monitorsQuery = useQuery({
    queryKey: ["monitors"],
    queryFn: () => fetchMonitors(),
    refetchInterval: 10_000,
  });

  const activityQuery = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(),
    refetchInterval: 15_000,
  });

  const monitors = monitorsQuery.data ?? [];

  // While the dashboard is open, nudge due monitors so status updates feel live.
  useQuery({
    queryKey: ["due-sweep"],
    queryFn: async () => {
      const result = await check({ data: {} });
      if (result.checked > 0) {
        await queryClient.invalidateQueries({ queryKey: ["monitors"] });
        await queryClient.invalidateQueries({ queryKey: ["activity"] });
      }
      return result;
    },
    enabled: monitors.length > 0,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["monitors"] });
    await queryClient.invalidateQueries({ queryKey: ["activity"] });
    await queryClient.invalidateQueries({ queryKey: ["status-overview"] });
  };

  const addMutation = useMutation({
    mutationFn: (values: { name: string; url: string; intervalSeconds: number }) =>
      createMonitor({ data: values }),
    onSuccess: async () => {
      setAddOpen(false);
      toast.success("Monitor added — first check done");
      await invalidateAll();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not add monitor"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeMonitor({ data: { id } }),
    onSuccess: async () => {
      toast.success("Monitor deleted");
      await invalidateAll();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not delete monitor"),
  });

  const refreshMutation = useMutation({
    mutationFn: () => check({ data: { force: true } }),
    onSuccess: async (result) => {
      toast.success(`Checked ${result.checked} monitor${result.checked === 1 ? "" : "s"}`);
      await invalidateAll();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Check failed"),
  });

  const stats = useMemo(() => {
    const up = monitors.filter((monitor) => monitor.last_status === "up").length;
    const down = monitors.filter((monitor) => monitor.last_status === "down").length;
    const rated = up + down;
    return {
      total: monitors.length,
      up,
      down,
      uptime: rated ? Math.round((up / rated) * 1000) / 10 : null,
    };
  }, [monitors]);

  const visible = monitors.filter((monitor) => {
    const text = `${monitor.name} ${monitor.url}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (filter !== "all" && monitor.last_status !== filter) return false;
    return true;
  });

  const monitorNames = new Map(monitors.map((monitor) => [monitor.id, monitor.name]));

  async function signOut() {
    clearSession();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        email={user.email ?? "you@rootx.dev"}
        monitorCount={monitors.length}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={signOut}
      />

      <main className="px-4 py-6 sm:px-7 lg:ml-[245px]">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <div className="mr-auto">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              root<span className="text-primary">X</span> UPTIMER
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Monitoring runs on our servers around the clock, on each monitor&apos;s interval.
            </p>
          </div>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending || monitors.length === 0}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", refreshMutation.isPending && "animate-spin")} />
            Check now
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-chart-1 px-4 text-xs font-extrabold text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="size-4" />
            Add Monitor
          </button>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total monitors", value: stats.total, icon: Globe, tone: "text-primary" },
            { label: "Websites up", value: stats.up, icon: TrendingUp, tone: "text-success" },
            { label: "Websites down", value: stats.down, icon: TrendingDown, tone: "text-destructive" },
            {
              label: "Average uptime",
              value: stats.uptime === null ? "—" : `${stats.uptime}%`,
              icon: ArrowUpRight,
              tone: "text-warning",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold tracking-[1.2px] text-muted-foreground uppercase">
                  {card.label}
                </span>
                <card.icon className={cn("size-4", card.tone)} />
              </div>
              <div className="mt-3 text-2xl font-extrabold">{card.value}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <h2 className="mr-auto text-sm font-extrabold">All monitors</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="h-9 w-40 rounded-lg border border-border bg-surface pl-8 text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
                {(["all", "up", "down"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-[10px] font-extrabold uppercase transition",
                      filter === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {monitorsQuery.isLoading && (
              <p className="flex items-center gap-2 p-5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Loading monitors…
              </p>
            )}

            {!monitorsQuery.isLoading && visible.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm font-bold">
                  {monitors.length === 0 ? "No monitors yet" : "Nothing matches this filter"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {monitors.length === 0
                    ? "Add a website and rootX will keep checking it on your chosen interval."
                    : "Try a different search or status filter."}
                </p>
              </div>
            )}

            <ul className="divide-y divide-border">
              {visible.map((monitor) => (
                <li
                  key={monitor.id}
                  className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-secondary/40"
                >
                  <button
                    onClick={() => setDetailId(monitor.id)}
                    className="mr-auto min-w-0 text-left"
                  >
                    <div className="truncate text-sm font-bold">{monitor.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{monitor.url}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {formatInterval(monitor.interval_seconds)} · last check{" "}
                      {relativeTime(monitor.last_checked_at)}
                    </div>
                  </button>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <div className="font-extrabold text-foreground">
                      {monitor.last_response_ms === null ? "—" : `${monitor.last_response_ms} ms`}
                    </div>
                    <div>HTTP {monitor.last_status_code ?? "—"}</div>
                  </div>
                  <StatusPill status={monitor.last_status} />
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${monitor.name}"? Its history is removed too.`)) {
                        deleteMutation.mutate(monitor.id);
                      }
                    }}
                    title="Delete monitor"
                    className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-extrabold">Overall uptime</h2>
              <div className="mt-3 text-3xl font-extrabold">
                {stats.uptime === null ? "—" : `${stats.uptime}%`}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-success to-primary transition-all"
                  style={{ width: `${stats.uptime ?? 0}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Based on the latest status of every monitor.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card">
              <h2 className="border-b border-border p-4 text-sm font-extrabold">Recent activity</h2>
              <ul className="divide-y divide-border">
                {(activityQuery.data ?? []).length === 0 && (
                  <li className="p-4 text-xs text-muted-foreground">No checks recorded yet.</li>
                )}
                {(activityQuery.data ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 p-3 text-[11px]">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        item.status === "up" ? "bg-success" : "bg-destructive",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {monitorNames.get(item.monitor_id) ?? "Monitor"}
                    </span>
                    <span className="text-muted-foreground">
                      {item.response_ms ?? "—"} ms · {relativeTime(item.checked_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <AddMonitorDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        saving={addMutation.isPending}
        onSubmit={async (values) => {
          await addMutation.mutateAsync(values);
        }}
      />
      <MonitorDetailDialog
        monitorId={detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}
