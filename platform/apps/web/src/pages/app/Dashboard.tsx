import { TEMPLATES, getCreator, type ProjectSummary, type Video } from "@castly/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Reveal } from "../../components/Reveal";
import { SplitHeadline } from "../../components/SplitHeadline";
import { Button, Mono, Notice, SectionLabel, Spinner } from "../../components/ui";
import { errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { plural, timeAgo } from "../../lib/format";
import { useCreateProject, useDeleteProject, useMe, useProjects } from "../../lib/queries";

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

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5M14 11v5" />
    </svg>
  );
}

function ProjectCard({ project, onDeleted }: { project: ProjectSummary; onDeleted: (title: string) => void }) {
  const creator = getCreator(project.creatorId);
  const title = project.title || "Untitled cut";
  // Only drafts are deletable from the grid; a clip or a render is deleted from inside the editor.
  const isDraft = !project.latestVideo;
  const remove = useDeleteProject();
  const [confirming, setConfirming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const busy = remove.isPending;

  useEffect(() => {
    if (confirming) keep.current?.focus();
    else if (wasConfirming.current) trigger.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  // Gone as soon as the server says so, without waiting for the list to refetch.
  if (remove.isSuccess) return null;

  const cancel = () => {
    if (busy) return;
    remove.reset();
    setConfirming(false);
  };
  const confirm = () => remove.mutate(project.id, { onSuccess: () => onDeleted(title) });
  const headingId = `delete-${project.id}`;

  return (
    <div className="relative min-w-0">
      <Link to={`/app/projects/${project.id}`} className="tile-zoom group block">
        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-hair">
          <img src={creator.portrait} alt="" className="tile-media absolute inset-0 size-full object-cover object-top" loading="lazy" />
          <span className="absolute left-3 top-3">
            <StatusTag video={project.latestVideo} />
          </span>
        </div>
        <p className="text-[17px] font-medium">{title}</p>
        <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-muted">{project.hook ? `“${project.hook}”` : "No hook yet."}</p>
        <Mono className="mt-2 block">Edited {timeAgo(project.updatedAt)}</Mono>
      </Link>

      {isDraft && !confirming && (
        <button
          ref={trigger}
          type="button"
          aria-label={`Delete draft ${title}`}
          onClick={() => setConfirming(true)}
          className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-lg border border-line bg-night/70 text-ink backdrop-blur-md transition-colors duration-300 hover:border-danger/60 hover:bg-night hover:text-danger focus-visible:border-danger/60 focus-visible:bg-night focus-visible:text-danger focus-visible:outline-iris-soft"
        >
          <TrashIcon />
        </button>
      )}

      {confirming && (
        <div
          role="group"
          aria-labelledby={headingId}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          className="fade-up absolute inset-x-0 top-0 flex aspect-[4/3] flex-col justify-end gap-3.5 rounded-lg border border-danger/35 bg-night/90 p-5 backdrop-blur-sm [animation-duration:.45s]"
        >
          <span className="font-mono text-xs uppercase tracking-[0.06em] text-danger">Delete draft</span>
          <p id={headingId} className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Delete “{title}”?
          </p>
          <p className="text-sm leading-[1.55] text-muted">The script, voice takes and product photo go with it. This can’t be undone.</p>
          {remove.error && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(remove.error)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              ref={keep}
              type="button"
              disabled={busy}
              onClick={cancel}
              className="min-h-11 rounded-lg border border-white/20 bg-night-2 px-4 text-[15px] font-medium text-ink transition-colors duration-300 hover:border-ink disabled:opacity-50"
            >
              Keep it
            </button>
            <button
              type="button"
              disabled={busy}
              aria-busy={busy || undefined}
              onClick={confirm}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-danger px-4 text-[15px] font-semibold text-night transition-colors duration-300 hover:bg-[#ffa49a] disabled:cursor-wait"
            >
              {busy && <Spinner className="size-3.5" />}
              {busy ? "Deleting…" : remove.error ? "Try again" : "Delete draft"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Says which draft went, then clears itself. */
function DeletedToast({ title, onDismiss }: { title: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!title) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [title, onDismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      {title && (
        <div className="fade-up pointer-events-auto flex max-w-full items-center gap-4 rounded-[10px] border border-line bg-night-3 py-2.5 pl-4 pr-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.45)] [animation-duration:.45s]">
          <span className="min-w-0 truncate text-[15px]">Deleted “{title}”.</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={onDismiss}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-300 hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const me = useMe().data;
  const projects = useProjects();
  const create = useCreateProject();
  const navigate = useNavigate();
  const [deleted, setDeleted] = useState<string | null>(null);
  const dismiss = useCallback(() => setDeleted(null), []);

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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-hair" />
            ))}
          </div>
        ) : projects.error ? (
          <Notice>{errorMessage(projects.error)}</Notice>
        ) : projects.data && projects.data.length > 0 ? (
          // auto-fill keeps empty tracks, so one or two cards stay card-sized instead of stretching.
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] items-start gap-x-2 gap-y-8">
            {projects.data.map((project) => (
              <ProjectCard key={project.id} project={project} onDeleted={setDeleted} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
            <p className="text-xl tracking-[-0.4px]">No cuts yet.</p>
            <p className="mt-2 text-muted">Start a new ad, or remix a template above.</p>
          </div>
        )}
      </section>
      <DeletedToast title={deleted} onDismiss={dismiss} />
    </main>
  );
}
