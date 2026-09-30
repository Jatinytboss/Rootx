import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionUser, isSignedIn } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const user = getSessionUser();
    if (!isSignedIn() || !user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
