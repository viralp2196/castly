import { Link, createFileRoute } from "@tanstack/react-router";
import { AdEditor } from "@/components/castly/ad-editor";
import { BenchSkeleton } from "@/components/castly/studio-shell";
import { SAMPLE_ID, sampleProject } from "@/lib/castly/catalog";
import { useCastly } from "@/lib/castly/store";

export const Route = createFileRoute("/studio/p/$id")({
  head: () => ({ meta: [{ title: "Cut · Castly" }] }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const hydrated = useCastly((state) => state.hydrated);
  const project = useCastly((state) => state.projects.find((item) => item.id === id));
  const create = useCastly((state) => state.create);

  if (!hydrated) return <BenchSkeleton />;
  if (!project) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-3xl">That cut isn't on the bench.</h1>
        <p className="mt-3 text-muted">It may have been deleted in this browser.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/studio" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink">
            Back to the bench
          </Link>
          {id === SAMPLE_ID ? (
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm"
              onClick={() => create(sampleProject())}
            >
              Restore the sample
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return <AdEditor key={project.id} project={project} />;
}
