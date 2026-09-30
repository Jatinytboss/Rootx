import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/uptimer/PageShell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — rootX UPTIMER" },
      {
        name: "description",
        content: "Manage your rootX UPTIMER account details and monitoring preferences.",
      },
      { property: "og:title", content: "Settings — rootX UPTIMER" },
      {
        property: "og:description",
        content: "Manage your rootX UPTIMER account details and monitoring preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();

  return (
    <PageShell
      email={user.email}
      kicker="Manage"
      title="Settings"
      description="Your account details."
    >
      <div className="max-w-xl rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-extrabold">Account</h2>
        <dl className="mt-4 space-y-3 text-[12px]">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-bold">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-bold">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Account ID</dt>
            <dd className="font-mono text-[10px]">{user.id}</dd>
          </div>
        </dl>
        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          Accounts and monitoring data are stored in your own MongoDB database.
        </p>
      </div>
    </PageShell>
  );
}
