import { Navigate, Outlet, useLocation } from "react-router";
import { AppHeader } from "../../components/Headers";
import { Button, Notice, Spinner } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { useMe } from "../../lib/queries";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted" role="status" aria-label="Loading">
      <Spinner className="size-5" />
    </div>
  );
}

export function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isLoading) return <FullPageSpinner />;
  if (me.isError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-24">
        <Notice>{errorMessage(me.error)}</Notice>
        <Button variant="secondary" className="self-start" onClick={() => void me.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function AppLayout() {
  return (
    <div className="theme-night min-h-dvh bg-night font-sans text-ink">
      <AppHeader />
      <Outlet />
    </div>
  );
}
