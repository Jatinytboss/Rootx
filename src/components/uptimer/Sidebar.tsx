import { Link } from "@tanstack/react-router";
import {
  Activity,
  LayoutGrid,
  Radio,
  LineChart,
  TriangleAlert,
  Settings,
  LifeBuoy,
  LogOut,
} from "lucide-react";

type SidebarProps = {
  email: string;
  monitorCount: number;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

const linkBase =
  "mb-1 flex h-[43px] w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground";
const linkActive =
  "mb-1 flex h-[43px] w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-semibold border border-primary/20 bg-gradient-to-r from-primary/15 to-transparent text-foreground";

export function Sidebar({ email, monitorCount, open, onClose, onSignOut }: SidebarProps) {
  const initials = email.slice(0, 2).toUpperCase();

  const workspace = [
    { to: "/dashboard", label: "Overview", icon: LayoutGrid, badge: monitorCount },
    { to: "/status", label: "Status page", icon: Radio },
    { to: "/analytics", label: "Analytics", icon: LineChart },
    { to: "/incidents", label: "Incidents", icon: TriangleAlert },
  ] as const;

  const manage = [
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/help", label: "Help Center", icon: LifeBuoy },
  ] as const;

  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-[245px] flex-col overflow-y-auto border-r border-border bg-sidebar px-4 py-5 transition-transform duration-300 " +
          (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        }
      >
        <div className="mb-7 flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-chart-1 shadow-[0_0_25px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
            <Activity className="size-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="text-[17px] font-extrabold">
            root<span className="text-primary">X</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-2 px-3 text-[10px] font-extrabold tracking-[1.4px] text-muted-foreground uppercase">
            Workspace
          </div>
          {workspace.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={linkBase}
              activeProps={{ className: linkActive }}
            >
              <item.icon className="size-[18px]" strokeWidth={1.8} />
              <span>{item.label}</span>
              {"badge" in item && item.badge !== undefined && (
                <span className="ml-auto rounded-full bg-primary/12 px-2 py-0.5 text-[10px] text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div>
          <div className="mb-2 px-3 text-[10px] font-extrabold tracking-[1.4px] text-muted-foreground uppercase">
            Manage
          </div>
          {manage.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={linkBase}
              activeProps={{ className: linkActive }}
            >
              <item.icon className="size-[18px]" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-4 rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-extrabold">Need help?</div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              rootX keeps pinging your sites on their interval, even when this tab is closed.
            </p>
            <Link
              to="/help"
              onClick={onClose}
              className="mt-3 flex h-8 items-center justify-center rounded-lg border border-border bg-surface text-[10px] font-bold text-muted-foreground transition hover:text-foreground"
            >
              View documentation
            </Link>
          </div>
          <div className="flex items-center gap-2.5 border-t border-border pt-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-1 text-[11px] font-extrabold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold">{email.split("@")[0]}</div>
              <div className="truncate text-[9px] text-muted-foreground">{email}</div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="ml-auto text-muted-foreground transition hover:text-destructive"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
