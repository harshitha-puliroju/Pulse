import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ManageView } from "@/components/pulse/manage-view";
import { Skeleton } from "@/components/ui/skeleton";

type Search = { listId?: string };

export const Route = createFileRoute("/manage")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    listId: typeof s.listId === "string" ? s.listId : undefined,
  }),
  component: ManagePage,
});

function ManagePage() {
  const { listId } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <ManageView listId={listId} />;
}
