import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu } from "lucide-react";
import { clearSession } from "@/lib/auth-client";
import { Sidebar } from "@/components/uptimer/Sidebar";
import { listMonitors } from "@/lib/monitors.functions";

type Props = {
  email: string;
  kicker: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({ email, kicker, title, description, actions, children }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchMonitors = useServerFn(listMonitors);
  const [menuOpen, setMenuOpen] = useState(false);

  const monitorsQuery = useQuery({
    queryKey: ["monitors"],
    queryFn: () => fetchMonitors(),
    refetchInterval: 30_000,
  });

  async function signOut() {
    clearSession();
    queryClient.clear();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        email={email}
        monitorCount={monitorsQuery.data?.length ?? 0}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSignOut={signOut}
      />
      <main className="px-4 py-6 sm:px-7 lg:ml-[245px]">
        <header className="mb-6 flex flex-wrap items-center gap-3" data-reveal>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
          <div className="mr-auto">
            <div className="text-[10px] font-extrabold tracking-[1.6px] text-primary uppercase">
              {kicker}
            </div>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          </div>
          {actions}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Panel({
  title,
  sub,
  action,
  children,
  className,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"rounded-2xl border border-border bg-card " + (className ?? "")} data-reveal>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="mr-auto">
          <div className="text-sm font-extrabold">{title}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
