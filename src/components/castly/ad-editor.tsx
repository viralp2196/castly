import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Copy, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/castly/button";
import { PhoneStage } from "@/components/castly/phone-stage";
import { writeScript } from "@/lib/castly/ai";
import {
  ANGLES,
  ASPECTS,
  CAPTIONS,
  CREATORS,
  FORMATS,
  LANGUAGES,
  SCENES,
  SPEEDS,
  getCreator,
  joinScript,
  starterScript,
} from "@/lib/castly/catalog";
import { readProductImage } from "@/lib/castly/image";
import { useCastly } from "@/lib/castly/store";
import type { AdProject, FormatId } from "@/lib/castly/types";
import { useSpokenCut } from "@/lib/castly/use-spoken";
import { cn } from "@/lib/utils";

export function AdEditor({ project }: { project: AdProject }) {
  const patch = useCastly((state) => state.patch);
  const remove = useCastly((state) => state.remove);
  const duplicate = useCastly((state) => state.duplicate);
  const navigate = useNavigate();
  const spoken = useSpokenCut();
  const take = useRef(0);
  const [aiBusy, setAiBusy] = useState<null | "full" | "hooks">(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [gender, setGender] = useState<"all" | "woman" | "man">("all");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (partial: Partial<AdProject>) => patch(project.id, partial);
  const text = joinScript(project.script);
  const speakKey = `${getCreator(project.creatorId).voiceId}|${project.language}|${project.speed}|${text}`;
  const sameTake = spoken.activeKey === speakKey && speakKey.length > 0;

  const onPrimary = () => {
    if (spoken.phase === "playing" && sameTake) {
      spoken.toggle();
      return;
    }
    if (spoken.phase === "paused" && sameTake) {
      spoken.toggle();
      return;
    }
    void spoken.speak({
      text,
      voiceId: getCreator(project.creatorId).voiceId,
      language: project.language,
      speed: project.speed,
    });
  };

  const runWriter = async (mode: "full" | "hooks") => {
    setAiError(null);
    setAiBusy(mode);
    take.current += 1;
    const result = await writeScript({
      data: {
        product: project.product,
        pitch: project.pitch,
        audience: project.audience,
        offer: project.offer,
        angle: project.angle,
        language: project.language,
        mode,
        take: take.current,
      },
    });
    setAiBusy(null);
    if (!result.ok) {
      setAiError(result.error);
      return;
    }
    set({
      title: project.title === "Untitled cut" && project.product ? project.product : project.title,
      script: {
        hook: mode === "hooks" ? result.hook || project.script.hook : result.hook,
        body: mode === "hooks" ? project.script.body : result.body,
        cta: mode === "hooks" ? project.script.cta : result.cta,
        altHooks: result.altHooks.length ? result.altHooks : project.script.altHooks,
      },
    });
  };

  const cast = CREATORS.filter((creator) => gender === "all" || creator.gender === gender);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/studio" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted">
          <ChevronLeft className="size-4" />
          Bench
        </Link>
        <input
          className="min-w-0 flex-1 bg-transparent font-display text-2xl text-fg outline-none"
          value={project.title}
          aria-label="Cut title"
          onChange={(event) => set({ title: event.target.value.slice(0, 80) })}
        />
        <Button
          variant="ghost"
          onClick={() => {
            const id = duplicate(project.id);
            if (id) void navigate({ to: "/studio/p/$id", params: { id } });
          }}
        >
          <Copy className="size-4" />
          Copy
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            remove(project.id);
            void navigate({ to: "/studio" });
          }}
        >
          <Trash2 className="size-4" />
          {confirmDelete ? "Confirm delete" : "Delete"}
        </Button>
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 space-y-10 lg:order-1">
          <Section kicker="01" title="The product">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="field"
                  value={project.product}
                  placeholder="Morning Dew Serum"
                  onChange={(event) => set({ product: event.target.value.slice(0, 80) })}
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium">What it actually does</span>
                <textarea
                  className="field"
                  value={project.pitch}
                  placeholder="One plain sentence. No slogan."
                  onChange={(event) => set({ pitch: event.target.value.slice(0, 320) })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Who it's for</span>
                <input
                  className="field"
                  value={project.audience}
                  onChange={(event) => set({ audience: event.target.value.slice(0, 120) })}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">The honest offer</span>
                <input
                  className="field"
                  value={project.offer}
                  onChange={(event) => set({ offer: event.target.value.slice(0, 140) })}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm">
                <Upload className="size-4" />
                {project.productImage ? "Replace photo" : "Add product photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setImgError(null);
                    void readProductImage(file)
                      .then((productImage) => set({ productImage, format: project.format === "talking" ? "in-hand" : project.format }))
                      .catch((error: unknown) => {
                        setImgError(error instanceof Error ? error.message : "Couldn't read that photo.");
                      });
                  }}
                />
              </label>
              {project.productImage ? (
                <button type="button" className="text-sm text-muted" onClick={() => set({ productImage: undefined })}>
                  Remove photo
                </button>
              ) : null}
              {imgError ? <p className="text-sm text-primary">{imgError}</p> : null}
            </div>
          </Section>

          <Section kicker="02" title="The line">
            <div className="flex flex-wrap gap-2">
              {ANGLES.map((angle) => (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => set({ angle: angle.id })}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm",
                    project.angle === angle.id ? "border-primary bg-primary text-primary-ink" : "border-border text-fg",
                  )}
                >
                  {angle.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Language</span>
                <select
                  className="field"
                  value={project.language}
                  onChange={(event) => set({ language: event.target.value })}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={aiBusy !== null} onClick={() => void runWriter("full")}>
                  {aiBusy === "full" ? "Writing…" : "Write with AI"}
                </Button>
                <Button variant="ghost" disabled={aiBusy !== null} onClick={() => void runWriter("hooks")}>
                  {aiBusy === "hooks" ? "Writing…" : "New hooks"}
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => set({ script: starterScript(project.product, project.angle) })}
                >
                  English starter
                </Button>
              </div>
            </div>
            {aiError ? <p className="text-sm text-primary">{aiError}</p> : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Hook</span>
              <textarea
                className="field"
                value={project.script.hook}
                onChange={(event) =>
                  set({ script: { ...project.script, hook: event.target.value.slice(0, 220) } })
                }
              />
            </label>
            {project.script.altHooks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.script.altHooks.map((hook) => (
                  <button
                    key={hook}
                    type="button"
                    className="max-w-full rounded-md border border-border px-3 py-2 text-left text-sm text-muted"
                    onClick={() => set({ script: { ...project.script, hook } })}
                  >
                    {hook}
                  </button>
                ))}
              </div>
            ) : null}
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Middle</span>
              <textarea
                className="field"
                value={project.script.body}
                onChange={(event) =>
                  set({ script: { ...project.script, body: event.target.value.slice(0, 600) } })
                }
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Ask</span>
              <textarea
                className="field"
                value={project.script.cta}
                onChange={(event) =>
                  set({ script: { ...project.script, cta: event.target.value.slice(0, 200) } })
                }
              />
            </label>
            <p className="text-xs text-faint">{text.length} / 900 characters in the voice preview.</p>
          </Section>

          <Section kicker="03" title="The cast">
            <div className="flex gap-2">
              {(
                [
                  ["all", "All"],
                  ["woman", "Women"],
                  ["man", "Men"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGender(id)}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm",
                    gender === id ? "border-brass bg-brass text-brass-ink" : "border-border text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cast.map((creator) => {
                const on = creator.id === project.creatorId;
                return (
                  <button
                    key={creator.id}
                    type="button"
                    onClick={() => set({ creatorId: creator.id })}
                    className={cn(
                      "overflow-hidden rounded-lg border text-left",
                      on ? "border-primary" : "border-border",
                    )}
                  >
                    <img src={creator.portrait} alt="" className="frame-portrait w-full object-cover" />
                    <span className="block px-2 py-2">
                      <span className="block text-sm font-medium">{creator.name}</span>
                      <span className="block text-xs text-muted">{creator.role}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section kicker="04" title="The frame">
            <div className="grid gap-3 sm:grid-cols-3">
              {FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => set({ format: format.id as FormatId })}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-3 text-left",
                    project.format === format.id ? "border-primary bg-surface-2" : "border-border",
                  )}
                >
                  <span className="block text-sm font-medium">{format.label}</span>
                  <span className="mt-1 block text-xs text-muted">{format.detail}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => set({ sceneId: scene.id })}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-2 text-left",
                    project.sceneId === scene.id ? "border-primary" : "border-border",
                  )}
                >
                  <img src={scene.image} alt="" className="h-14 w-11 rounded-md object-cover" />
                  <span>
                    <span className="block text-sm font-medium">{scene.label}</span>
                    <span className="block text-xs text-muted">{scene.detail}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((aspect) => (
                <button
                  key={aspect.id}
                  type="button"
                  onClick={() => set({ aspect: aspect.id })}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm",
                    project.aspect === aspect.id ? "border-primary bg-primary text-primary-ink" : "border-border",
                  )}
                >
                  {aspect.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {CAPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => set({ captionStyle: style.id })}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm",
                    project.captionStyle === style.id ? "border-brass bg-brass text-brass-ink" : "border-border",
                  )}
                >
                  {style.label}
                </button>
              ))}
              {SPEEDS.map((speed) => (
                <button
                  key={speed.id}
                  type="button"
                  onClick={() => set({ speed: speed.id })}
                  className={cn(
                    "min-h-11 rounded-md border px-3 text-sm",
                    project.speed === speed.id ? "border-brass bg-brass text-brass-ink" : "border-border",
                  )}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="order-1 lg:sticky lg:top-4 lg:order-2">
          <PhoneStage project={project} spoken={spoken} onPrimary={onPrimary} />
          <p className="mx-auto mt-3 max-w-xs text-center text-xs text-muted">
            Spoken cut. The face is a living still. The voice and the captions are the performance.
          </p>
          {spoken.error ? <p className="mt-2 text-center text-sm text-primary">{spoken.error}</p> : null}
          <audio ref={spoken.audioRef} preload="auto" className="audio-ghost" />
        </div>
      </div>
    </div>
  );
}

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-faint">{kicker}</p>
        <h2 className="mt-1 text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
