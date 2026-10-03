import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BenchSkeleton } from "@/components/castly/studio-shell";
import { TEMPLATES, getCreator, projectFromTemplate } from "@/lib/castly/catalog";
import { useCastly } from "@/lib/castly/store";

export const Route = createFileRoute("/studio/library")({
  head: () => ({ meta: [{ title: "Library · Castly" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const hydrated = useCastly((state) => state.hydrated);
  const create = useCastly((state) => state.create);
  const navigate = useNavigate();
  if (!hydrated) return <BenchSkeleton />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <p className="text-xs font-medium uppercase tracking-widest text-faint">Library</p>
      <h1 className="mt-1 max-w-2xl text-4xl">Proven shapes. Your product.</h1>
      <p className="mt-3 max-w-xl text-muted">
        These are starter ads, not scraped winners. Recreate one and swap the product, the face, and the line.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {TEMPLATES.map((template) => {
          const creator = getCreator(template.creatorId);
          return (
            <li key={template.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="grid grid-cols-[7rem_minmax(0,1fr)]">
                <img src={creator.portrait} alt="" className="h-full w-full object-cover" />
                <div className="space-y-2 p-4">
                  <p className="text-xs uppercase tracking-widest text-faint">{template.niche}</p>
                  <h2 className="text-xl">{template.title}</h2>
                  <p className="text-sm text-muted">“{template.script.hook}”</p>
                  <p className="text-xs text-faint">
                    {creator.name} · {template.format === "in-hand" ? "Product in frame" : template.format === "hook-broll" ? "Hook, then b-roll" : "Talking cut"}
                  </p>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-ink"
                    onClick={() => {
                      const id = create(projectFromTemplate(template));
                      void navigate({ to: "/studio/p/$id", params: { id } });
                    }}
                  >
                    Recreate
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
