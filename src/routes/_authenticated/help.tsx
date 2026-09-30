import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/uptimer/PageShell";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help Center — rootX UPTIMER" },
      {
        name: "description",
        content: "How rootX UPTIMER checks your websites, intervals, incidents and status pages.",
      },
      { property: "og:title", content: "Help Center — rootX UPTIMER" },
      {
        property: "og:description",
        content: "How rootX UPTIMER checks your websites, intervals, incidents and status pages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpPage,
});

const topics = [
  {
    title: "How checks work",
    body: "Each monitor is pinged on its own interval. A response under HTTP 400 counts as up; anything else, a timeout or a network error counts as down.",
  },
  {
    title: "Background monitoring",
    body: "A scheduled sweep hits /api/public/cron/run-checks with your cron secret, so monitors keep being checked even when this tab is closed.",
  },
  {
    title: "Incidents",
    body: "Consecutive failed checks are grouped into one incident. It closes automatically on the first successful check after the outage.",
  },
  {
    title: "Status page",
    body: "The status page shows every monitor with its uptime percentage and the most recent check history.",
  },
];

function HelpPage() {
  const { user } = Route.useRouteContext();

  return (
    <PageShell
      email={user.email}
      kicker="Manage"
      title="Help Center"
      description="Everything about monitoring with rootX."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((topic) => (
          <section key={topic.title} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-extrabold">{topic.title}</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{topic.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
