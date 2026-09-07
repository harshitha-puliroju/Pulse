import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { InboxView } from "@/components/pulse/inbox-view";
import { Landing } from "@/components/pulse/landing";

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): { demo?: true } => {
    if (raw.demo === "1" || raw.demo === 1 || raw.demo === true) return { demo: true };
    return {};
  },
  component: Home,
});

function Home() {
  const { demo } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <Landing pending />;
  if (!user) return <Landing />;
  return <InboxView demo={demo} />;
}
