import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { monitorDetail } from "@/lib/monitors.functions";
import { cn } from "@/lib/utils";

type Props = {
  monitorId: string | null;
  onOpenChange: (open: boolean) => void;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

export function MonitorDetailDialog({ monitorId, onOpenChange }: Props) {
  const fetchDetail = useServerFn(monitorDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["monitor-detail", monitorId],
    queryFn: () => fetchDetail({ data: { id: monitorId as string } }),
    enabled: Boolean(monitorId),
    refetchInterval: 15_000,
  });

  return (
    <Dialog open={Boolean(monitorId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            {data?.monitor.name ?? "Monitor details"}
          </DialogTitle>
          <DialogDescription className="text-xs break-all">
            {data?.monitor.url ?? "Loading…"}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-xs text-muted-foreground">Loading stats…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Status", value: data.monitor.last_status.toUpperCase() },
                {
                  label: "Response",
                  value: data.monitor.last_response_ms ? `${data.monitor.last_response_ms} ms` : "—",
                },
                { label: "HTTP code", value: data.monitor.last_status_code ?? "—" },
                { label: "Uptime", value: data.uptimePercent === null ? "—" : `${data.uptimePercent}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-surface p-3">
                  <div className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 text-sm font-extrabold",
                      item.label === "Status" && data.monitor.last_status === "up" && "text-success",
                      item.label === "Status" && data.monitor.last_status === "down" && "text-destructive",
                    )}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2">
              <div className="mb-2 text-[11px] font-extrabold">Check history</div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {data.history.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">No checks recorded yet.</p>
                )}
                {data.history.map((check) => (
                  <div key={check.id} className="flex items-center justify-between gap-3 p-3 text-[11px]">
                    <span
                      className={cn(
                        "w-14 font-extrabold",
                        check.status === "up" ? "text-success" : "text-destructive",
                      )}
                    >
                      {check.status.toUpperCase()}
                    </span>
                    <span className="text-muted-foreground">{formatTime(check.checked_at)}</span>
                    <span className="text-muted-foreground">
                      {check.status_code ?? "—"} · {check.response_ms ?? "—"} ms
                    </span>
                  </div>
                ))}
              </div>
              {data.avgResponse !== null && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Average response time across recent checks: {data.avgResponse} ms
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
