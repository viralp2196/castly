import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AudioLines, Clapperboard, Library, Plus } from "lucide-react";
import { hydrateBench, useCastly } from "@/lib/castly/store";
import { cn } from "@/lib/utils";

const links = [
  { to: "/studio", label: "Bench", icon: Clapperboard },
  { to: "/studio/library", label: "Library", icon: Library },
  { to: "/studio/agent", label: "Ad agent", icon: AudioLines },
] as const;

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    hydrateBench();
  }, []);

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-border lg:flex lg:flex-col lg:gap-6 lg:px-4 lg:py-6">
        <Link to="/" className="px-2 font-display text-2xl">
          Castly
        </Link>
        <nav className="flex flex-col gap-1">
          {links.map((item) => (
            <NavLink key={item.to} item={item} pathname={pathname} />
          ))}
        </nav>
        <NewCut className="mt-auto" />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-2 overflow-x-auto border-b border-border bg-bg px-3 py-2 lg:hidden">
          <Link to="/" className="mr-1 shrink-0 font-display text-xl">
            Castly
          </Link>
          {links.map((item) => (
            <NavLink key={item.to} item={item} pathname={pathname} />
          ))}
          <NewCut compact />
        </header>
        {children}
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof links)[number];
  pathname: string;
}) {
  const on = item.to === "/studio" ? pathname === "/studio" || pathname === "/studio/" : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm",
        on ? "bg-surface-2 text-fg" : "text-muted",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

function NewCut({ compact, className }: { compact?: boolean; className?: string }) {
  const navigate = useNavigate();
  const create = useCastly((state) => state.create);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-ink",
        compact ? "ml-auto shrink-0" : "w-full",
        className,
      )}
      onClick={() => {
        const id = create();
        void navigate({ to: "/studio/p/$id", params: { id } });
      }}
    >
      <Plus className="size-4" />
      {compact ? "New" : "New cut"}
    </button>
  );
}

export function BenchSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-muted">Opening the bench…</p>
    </div>
  );
}
