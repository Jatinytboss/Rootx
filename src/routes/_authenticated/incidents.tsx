import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { PageShell, Panel } from "@/components/uptimer/PageShell";
import { incidentsList } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents — rootX UPTIMER" },
      {
        name: "description",
        content:
          "Every downtime incident rootX UPTIMER detected: when it started, how long it lasted and the error returned.",
      },
      { property: "og:title", content: "Incidents — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Downtime incident history with duration and error details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

function duration(startedAt: string, endedAt: string | null) {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round((seconds / 3600) * 10) / 10}h`;
}

function IncidentsPage() {
  const { user } = Route.useRouteContext();
  const fetchIncidents = useServerFn(incidentsList);
  const { data, isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => fetchIncidents(),
    refetchInterval: 20_000,
  });

  const incidents = data ?? [];
  const ongoing = incidents.filter((incident) => incident.endedAt === null);

  return (
    <PageShell
      email={user.email ?? "you@rootx.dev"}
      kicker="rootX UPTIMER"
      title="Incidents"
      description="Downtime detected by rootX, grouped into incidents per website."
    >
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Ongoing", value: ongoing.length, tone: "text-destructive" },
          { label: "Resolved", value: incidents.length - ongoing.length, tone: "text-success" },
          { label: "Total incidents", value: incidents.length, tone: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4" data-reveal>
            <div className="text-[10px] font-extrabold tracking-[1.2px] text-muted-foreground uppercase">
              {card.label}
            </div>
            <div className={cn("mt-3 text-2xl font-extrabold", card.tone)}>{card.value}</div>
          </div>
        ))}
      </section>

      <Panel title="Incident history" sub="Newest first">
        {isLoading && <p className="p-5 text-xs text-muted-foreground">Loading incidents…</p>}
        {!isLoading && incidents.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-sm font-bold">No incidents yet</p>
            <p className="text-xs text-muted-foreground">
              Every check so far has been successful. Nice.
            </p>
          </div>
        )}
        <ul className="divide-y divide-border">
          {incidents.map((incident) => (
            <li key={incident.id} className="flex flex-wrap items-center gap-3 p-4">
              <TriangleAlert
                className={cn(
                  "size-4 shrink-0",
                  incident.endedAt ? "text-warning" : "text-destructive",
                )}
              />
              <div className="mr-auto min-w-0">
                <div className="truncate text-sm font-bold">{incident.monitorName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{incident.monitorUrl}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(incident.startedAt).toLocaleString()} ·{" "}
                  {incident.error ?? `HTTP ${incident.statusCode ?? "—"}`}
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className="font-extrabold">{duration(incident.startedAt, incident.endedAt)}</div>
                <div className="text-muted-foreground">{incident.failedChecks} failed checks</div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase",
                  incident.endedAt
                    ? "bg-success/12 text-success"
                    : "bg-destructive/12 text-destructive",
                )}
              >
                {incident.endedAt ? "resolved" : "ongoing"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  );
}
