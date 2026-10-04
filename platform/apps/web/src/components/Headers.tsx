import { Link, NavLink, useNavigate } from "react-router";
import { cn } from "../lib/cn";
import { plural } from "../lib/format";
import { useMe, useSession } from "../lib/queries";

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} aria-label="Castly home" className="inline-flex items-center gap-1.5 font-display text-[22px] font-bold leading-none tracking-[-0.03em]">
      castly<span className="size-[7px] rounded-full bg-iris" />
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn("text-lg transition-colors duration-300", isActive ? "text-ink" : "text-muted hover:text-ink");

/** Signed-in header: wordmark + name, app nav, credit balance, sign out. */
export function AppHeader() {
  const me = useMe().data;
  const { logout } = useSession();
  const navigate = useNavigate();
  return (
    <header className="border-b border-hair px-4 py-4">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col">
          <Wordmark to="/app" />
          <span className="mt-1 text-[15px] text-muted">— {me?.name ?? "Your bench"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav aria-label="App" className="flex flex-wrap gap-x-5 gap-y-1">
            <NavLink to="/app" end className={navClass}>
              Projects
            </NavLink>
            <NavLink to="/app/library" className={navClass}>
              Library
            </NavLink>
            <NavLink to="/app/account" className={navClass}>
              Account
            </NavLink>
          </nav>
          <Link
            to="/app/account"
            className="rounded-md border border-line px-2.5 py-1.5 font-mono text-xs text-ink transition-colors duration-300 hover:border-ink"
            title="Each 6s clip uses one credit"
          >
            {plural(me?.credits ?? 0, "credit")}
          </Link>
          <button
            type="button"
            className="min-h-11 text-lg text-muted transition-colors duration-300 hover:text-ink"
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/", { replace: true }) })}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
