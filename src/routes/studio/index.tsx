import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { getCreator, languageOf } from "@/lib/castly/catalog";
import { useCastly } from "@/lib/castly/store";
import { BenchSkeleton } from "@/components/castly/studio-shell";

export const Route = createFileRoute("/studio/")({
  head: () => ({ meta: [{ title: "Bench · Castly" }] }),
  component: BenchPage,
});

function BenchPage() {
  const hydrated = useCastly((state) => state.hydrated);
  const projects = useCastly((state) => state.projects);
  const create = useCastly((state) => state.create);
  const navigate = useNavigate();

  if (!hydrated) return <BenchSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Bench</p>
          <h1 className="mt-1 text-4xl">Cuts in progress</h1>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink"
          onClick={() => {
            const id = create();
            void navigate({ to: "/studio/p/$id", params: { id } });
          }}
        >
          New cut
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="mt-10 max-w-md text-muted">
          The bench is clear. Start a cut, or pull a shape from the library.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const creator = getCreator(project.creatorId);
            return (
              <li key={project.id}>
                <Link
                  to="/studio/p/$id"
                  params={{ id: project.id }}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  <img src={creator.portrait} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{project.title}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {project.script.hook.trim() || "No hook yet"}
                    </span>
                    <span className="mt-2 block text-xs text-faint">
                      {creator.name} · {languageOf(project.language).label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
