import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { INTERVALS } from "@/components/uptimer/intervals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; url: string; intervalSeconds: number }) => Promise<void>;
  saving: boolean;
};

export function AddMonitorDialog({ open, onOpenChange, onSubmit, saving }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ name: name.trim(), url: url.trim(), intervalSeconds });
    setName("");
    setUrl("");
    setIntervalSeconds(60);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">Add New Monitor</DialogTitle>
          <DialogDescription className="text-xs">
            rootX checks this URL from our servers on the interval you pick.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="monitor-name" className="text-[11px] font-bold text-muted-foreground uppercase">
              Monitor name
            </label>
            <input
              id="monitor-name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My Website"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="monitor-url" className="text-[11px] font-bold text-muted-foreground uppercase">
              Website URL
            </label>
            <input
              id="monitor-url"
              required
              type="url"
              maxLength={400}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="monitor-interval" className="text-[11px] font-bold text-muted-foreground uppercase">
              Monitoring interval
            </label>
            <select
              id="monitor-interval"
              value={intervalSeconds}
              onChange={(event) => setIntervalSeconds(Number(event.target.value))}
              className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            >
              {INTERVALS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-lg border border-border bg-surface px-4 text-xs font-bold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-chart-1 px-4 text-xs font-extrabold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Add Monitor
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
