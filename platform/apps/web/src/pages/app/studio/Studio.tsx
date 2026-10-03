import { joinScript } from "@castly/shared";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { SplitHeadline, type HeadlinePart } from "../../../components/SplitHeadline";
import { Button, Mono, Notice } from "../../../components/ui";
import { ApiError, errorMessage } from "../../../lib/api";
import { cn } from "../../../lib/cn";
import { useDeleteProject, useProject, useVideo } from "../../../lib/queries";
import { FullPageSpinner } from "../AppLayout";
import { Preview } from "./Preview";
import { StepCast, StepHear, StepShip, StepWrite } from "./steps";
import { useDraft } from "./useDraft";
import { useVoice } from "./useVoice";

const STEPS: { label: string; title: HeadlinePart[]; sub: string; next?: string }[] = [
  {
    label: "Write",
    title: [{ text: "Write", strong: true }, { text: "the line" }],
    sub: "Pick the hook that opens the ad. Write it with AI or type your own.",
    next: "Cast a creator",
  },
  {
    label: "Cast",
    title: [{ text: "Cast", strong: true }, { text: "a creator" }],
    sub: "Choose the face and voice that should say it. The preview updates as you pick.",
    next: "Hear the cut",
  },
  {
    label: "Hear",
    title: [{ text: "Hear", strong: true }, { text: "the cut" }],
    sub: "A real voice reads the script. Captions follow it word by word.",
    next: "Ship the take",
  },
  {
    label: "Ship",
    title: [{ text: "Ship", strong: true }, { text: "the take" }],
    sub: "Check the summary, pick an aspect, then generate a 6s clip.",
  },
];

export function Studio() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useProject(id);
  const draft = useDraft(query.data);
  const voice = useVoice(id);
  const remove = useDeleteProject();
  const [params, setParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [chosenClip, setChosenClip] = useState<string | null>(null);

  const step = Math.min(4, Math.max(1, Number(params.get("step")) || 1));
  const project = draft.draft;
  const clipId = chosenClip ?? project?.latestVideo?.id ?? null;
  const clip = useVideo(clipId).data ?? null;

  if (query.isLoading || (!project && !query.error)) return <FullPageSpinner />;
  if (query.error || !project) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-24">
        <Notice>{missing ? "That ad doesn't exist or isn't yours." : errorMessage(query.error)}</Notice>
        <Link to="/app" className="uline">
          Back to projects
        </Link>
      </main>
    );
  }

  const go = (n: number) => {
    void draft.flush();
    if (n !== 3) voice.stop();
    setParams({ step: String(n) }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const voiceKey = `${project.creatorId}|${project.speed}|${project.language}|${joinScript(project.script)}`;
  const meta = STEPS[step - 1]!;
  const stepProps = { project, update: draft.update, flush: draft.flush, replace: draft.replace };

  return (
    <div>
      <div className="relative border-b border-hair px-4">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-end justify-between gap-4 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link to="/app" className="text-sm text-muted transition-colors duration-300 hover:text-ink">
              ← Projects
            </Link>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="truncate text-lg font-medium">{project.title || "Untitled cut"}</span>
              <Mono className={cn(draft.state === "error" && "text-danger")} >
                {draft.state === "saving" ? "Saving…" : draft.state === "error" ? "Not saved" : "Saved"}
              </Mono>
            </span>
          </div>
          <nav aria-label="Steps" className="flex flex-wrap gap-x-5 gap-y-1">
            {STEPS.map((s, i) => {
              const active = step === i + 1;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => go(i + 1)}
                  className={cn(
                    "inline-flex min-h-11 items-baseline gap-2 border-b text-lg transition-colors duration-300",
                    active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  <span className="font-mono text-xs">00{i + 1}</span>
                  {s.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div
          className="absolute -bottom-px left-0 h-px bg-ink transition-[width] duration-700 ease-[var(--ease-expo)]"
          style={{ width: `${step * 25}%` }}
        />
      </div>

      {draft.error && (
        <div className="mx-auto max-w-[1440px] px-4 pt-4">
          <Notice>Couldn't save your last change: {draft.error}</Notice>
        </div>
      )}

      <main className="mx-auto flex max-w-[1440px] flex-wrap items-start gap-x-1 gap-y-4 px-4">
        <section className="flex min-h-[720px] min-w-0 flex-[999_1_560px] flex-col py-12 lg:pr-12">
          <div key={step} className="stagger flex-1">
            <div>
              <Mono className="mb-4 block text-sm">00{step} / 004</Mono>
              <SplitHeadline as="h2" parts={meta.title} delay={0.05} step={0.03} className="text-[clamp(36px,4.6vw,56px)]" />
            </div>
            <p className="mt-5 max-w-[540px] text-lg leading-[1.625] text-muted">{meta.sub}</p>
            <div className="mt-10">
              {step === 1 && <StepWrite {...stepProps} />}
              {step === 2 && <StepCast {...stepProps} />}
              {step === 3 && <StepHear {...stepProps} voice={voice} voiceKey={voiceKey} onBack={() => go(1)} />}
              {step === 4 && <StepShip {...stepProps} clip={clip} onClip={setChosenClip} />}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {step > 1 && (
                <Button variant="secondary" onClick={() => go(step - 1)}>
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                className={cn(confirmDelete && "text-danger hover:text-danger")}
                loading={remove.isPending}
                onBlur={() => setConfirmDelete(false)}
                onClick={() =>
                  confirmDelete ? remove.mutate(project.id, { onSuccess: () => navigate("/app", { replace: true }) }) : setConfirmDelete(true)
                }
              >
                {confirmDelete ? "Confirm delete" : "Delete ad"}
              </Button>
            </div>
            {meta.next ? (
              <Button arrow onClick={() => go(step + 1)}>
                {meta.next}
              </Button>
            ) : (
              <Link to="/app/library" className="uline text-[17px]">
                Open your library
              </Link>
            )}
          </div>
          {remove.error && <Notice>{errorMessage(remove.error)}</Notice>}
        </section>

        <aside aria-label="Live preview" className="w-full min-w-0 max-w-[520px] flex-[1_1_360px] py-12 lg:sticky lg:top-4">
          <Preview project={project} voice={voice} voiceKey={voiceKey} clip={step === 4 ? clip : null} />
        </aside>
      </main>
    </div>
  );
}
