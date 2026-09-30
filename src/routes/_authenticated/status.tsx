import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Menu } from "lucide-react";
import { clearSession } from "@/lib/auth-client";
import { Sidebar } from "@/components/uptimer/Sidebar";
import { formatInterval } from "@/components/uptimer/intervals";
import { statusOverview } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/status")({
  head: () => ({
    meta: [
      { title: "Status page — rootX UPTIMER" },
      {
        name: "description",
        content:
          "Live status page for every website you monitor, with uptime percentage and recent check history.",
      },
      { property: "og:title", content: "Status page — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Live status of every monitored website with uptime percentage and history bars.",
      },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const fetchOverview = useServerFn(statusOverview);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["status-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 15_000,
  });

  const rows = data ?? [];
  const allUp = rows.length > 0 && rows.every((row) => row.monitor.last_status === "up");
  const anyDown = rows.some((row) => row.monitor.last_status === "down");

  async function signOut() {
    clearSession();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        email={user.email ?? "you@rootx.dev"}
        monitorCount={rows.length}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={signOut}
      />

      <main className="px-4 py-6 sm:px-7 lg:ml-[245px]">
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Status page</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Live state of every website you monitor.
            </p>
          </div>
        </header>

        <section
          className={cn(
            "mb-5 rounded-2xl border p-5",
            anyDown
              ? "border-destructive/30 bg-destructive/8"
              : allUp
                ? "border-success/30 bg-success/8"
                : "border-border bg-card",
          )}
        >
          <div className="text-sm font-extrabold">
            {rows.length === 0
              ? "No monitors yet"
              : anyDown
                ? "Some websites are down"
                : allUp
                  ? "All systems operational"
                  : "Waiting for first checks"}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {rows.length === 0
              ? "Add a monitor from the overview page to start tracking."
              : `${rows.filter((row) => row.monitor.last_status === "up").length} of ${rows.length} monitors are up right now.`}
          </p>
        </section>

        {isLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading status…
          </p>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.monitor.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto min-w-0">
                  <div className="truncate text-sm font-bold">{row.monitor.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {row.monitor.url} · {formatInterval(row.monitor.interval_seconds)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "text-xs font-extrabold uppercase",
                      row.monitor.last_status === "up" && "text-success",
                      row.monitor.last_status === "down" && "text-destructive",
                      row.monitor.last_status === "preparing" && "text-warning",
                    )}
                  >
                    {row.monitor.last_status}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {row.uptimePercent === null ? "—" : `${row.uptimePercent}% uptime`}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-[3px]">
                {row.checks.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">No checks yet.</span>
                )}
                {[...row.checks].reverse().map((check) => (
                  <span
                    key={check.id}
                    title={`${check.status.toUpperCase()} · ${check.status_code ?? "—"} · ${check.response_ms ?? "—"} ms · ${new Date(check.checked_at).toLocaleString()}`}
                    className={cn(
                      "h-7 flex-1 rounded-[3px]",
                      check.status === "up" ? "bg-success/70" : "bg-destructive/70",
                    )}
                  />
                ))}
              </div>

              {row.monitor.last_error && row.monitor.last_status === "down" && (
                <p className="mt-2 text-[10px] text-destructive">{row.monitor.last_error}</p>
              )}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
