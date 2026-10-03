import { TEMPLATES, getCreator, type ProjectSummary, type Video } from "@castly/shared";
import { Link, useNavigate } from "react-router";
import { Reveal } from "../../components/Reveal";
import { SplitHeadline } from "../../components/SplitHeadline";
import { Button, Mono, Notice, SectionLabel } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { plural, timeAgo } from "../../lib/format";
import { useCreateProject, useMe, useProjects } from "../../lib/queries";

export function StatusTag({ video }: { video: Video | null }) {
  const label = !video ? "Draft" : video.status === "pending" ? "Rendering" : video.status === "ready" ? "Clip ready" : "Clip failed";
  return (
    <span
      className={cn(
        "rounded-md bg-white px-2 py-1 font-mono text-xs",
        video?.status === "failed" ? "text-danger" : video?.status === "ready" ? "text-ok" : "text-ink",
      )}
    >
      {label}
    </span>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const creator = getCreator(project.creatorId);
  return (
    <Link to={`/app/projects/${project.id}`} className="tile-zoom group block min-w-0 flex-[1_1_280px]">
      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-hair">
        <img src={creator.portrait} alt="" className="tile-media absolute inset-0 size-full object-cover object-top" loading="lazy" />
        <span className="absolute left-3 top-3">
          <StatusTag video={project.latestVideo} />
        </span>
      </div>
      <p className="text-[17px] font-medium">{project.title || "Untitled cut"}</p>
      <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-muted">{project.hook ? `“${project.hook}”` : "No hook yet."}</p>
      <Mono className="mt-2 block">Edited {timeAgo(project.updatedAt)}</Mono>
    </Link>
  );
}

export function Dashboard() {
  const me = useMe().data;
  const projects = useProjects();
  const create = useCreateProject();
  const navigate = useNavigate();

  const start = (templateId?: string) =>
    create.mutate(templateId, { onSuccess: ({ project }) => navigate(`/app/projects/${project.id}`) });

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24">
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-hair py-12">
        <SplitHeadline parts={[{ text: "Your", strong: true }, { text: "cuts." }]} className="text-[clamp(36px,5.5vw,64px)]" />
        <div className="fade-up flex flex-wrap items-center gap-4" style={{ animationDelay: ".3s" }}>
          <Mono>{plural(me?.credits ?? 0, "credit")} left · one per clip</Mono>
          <Button arrow loading={create.isPending && create.variables === undefined} disabled={create.isPending} onClick={() => start()}>
            New ad
          </Button>
        </div>
      </section>

      {create.error && (
        <div className="pt-6">
          <Notice>{errorMessage(create.error)}</Notice>
        </div>
      )}

      <section className="border-b border-hair py-12">
        <Reveal className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <SectionLabel>Start from a template</SectionLabel>
          <p className="max-w-md text-[15px] text-muted">Real scripts to remix. Change the product and the writer redrafts it.</p>
        </Reveal>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template, i) => (
            <Reveal key={template.id} delay={i * 0.06} className="flex min-w-0 flex-[1_1_260px]">
              <button
                type="button"
                disabled={create.isPending}
                onClick={() => start(template.id)}
                className="flex w-full flex-col justify-between gap-16 rounded-lg border border-line p-6 text-left transition-colors duration-300 hover:border-ink disabled:opacity-60"
              >
                <span className="flex items-center justify-between gap-3">
                  <Mono>{template.niche}</Mono>
                  <img src={getCreator(template.creatorId).portrait} alt="" className="size-9 rounded-full object-cover" />
                </span>
                <span>
                  <span className="block text-xl font-medium tracking-[-0.4px]">{template.title}</span>
                  <span className="mt-2 line-clamp-2 block text-[15px] leading-relaxed text-muted">“{template.script.hook}”</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-12">
        <SectionLabel className="mb-6">Projects</SectionLabel>
        {projects.isLoading ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/3] min-w-0 flex-[1_1_280px] animate-pulse rounded-lg bg-hair" />
            ))}
          </div>
        ) : projects.error ? (
          <Notice>{errorMessage(projects.error)}</Notice>
        ) : projects.data && projects.data.length > 0 ? (
          <div className="flex flex-wrap gap-x-2 gap-y-8">
            {projects.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
            <p className="text-xl tracking-[-0.4px]">No cuts yet.</p>
            <p className="mt-2 text-muted">Start a new ad, or remix a template above.</p>
          </div>
        )}
      </section>
    </main>
  );
}
