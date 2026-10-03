import {
  ANGLES,
  ASPECTS,
  CREATORS,
  FORMATS,
  LANGUAGES,
  SCENES,
  SPEEDS,
  activeWordIndex,
  getCreator,
  getScene,
  joinScript,
  wordCount,
  type LanguageId,
  type Project,
  type ProjectPatch,
  type Video,
} from "@castly/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Waveform } from "../../../components/Waveform";
import { Button, CheckBadge, Chip, Field, Mono, Notice, PauseIcon, PlayIcon, Progress, Spinner, TextArea } from "../../../components/ui";
import { api, apiUrl, errorMessage } from "../../../lib/api";
import { cn } from "../../../lib/cn";
import { clock, plural, spokenSeconds, timeAgo } from "../../../lib/format";
import { compressImage } from "../../../lib/image";
import { qk, refreshCredits, useCredits, useMe, useVideos } from "../../../lib/queries";
import type { Voice } from "./useVoice";

type StepProps = {
  project: Project;
  update: (patch: ProjectPatch) => void;
  flush: () => Promise<void>;
  replace: (project: Project) => void;
};

function Group({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <Mono className="mb-2 block">{label}</Mono>
      {children}
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  label,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-4 rounded-lg border px-5 py-4 text-left transition-colors duration-300",
        selected ? "border-ink bg-subtle" : "border-line bg-white hover:border-ink",
      )}
    >
      <span
        className={cn(
          "mt-1 size-[18px] shrink-0 rounded-full border transition-all duration-300",
          selected ? "border-ink bg-ink shadow-[inset_0_0_0_4px_#fff]" : "border-[#d1d5db] bg-white",
        )}
      />
      <span className="flex min-w-0 flex-col gap-1">
        <Mono>{label}</Mono>
        {children}
      </span>
    </button>
  );
}

/* 001 Write ---------------------------------------------------------------------------------- */

export function StepWrite({ project: p, update, flush, replace }: StepProps) {
  const qc = useQueryClient();
  const [take, setTake] = useState(0);
  const write = useMutation({
    mutationFn: async (mode: "full" | "hooks") => {
      await flush();
      return api<{ project: Project }>(`/api/projects/${p.id}/script`, { json: { mode, take } });
    },
    onSuccess: ({ project }) => {
      replace(project);
      setTake((t) => Math.min(6, t + 1));
      refreshCredits(qc);
    },
  });

  const s = p.script;
  const options = Array.from(new Set([s.hook, ...s.altHooks].map((h) => h.trim()).filter(Boolean)));
  const words = wordCount(joinScript(s));
  const angle = ANGLES.find((a) => a.id === p.angle);

  const pickHook = (hook: string) => {
    if (hook === s.hook) return;
    const rest = [s.hook, ...s.altHooks.filter((a) => a !== hook)].filter(Boolean).slice(0, 3);
    update({ script: { ...s, hook, altHooks: rest } });
  };
  const setLine = (key: "hook" | "body" | "cta", value: string) => update({ script: { ...s, [key]: value } });

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product" name="product" value={p.product} maxLength={80} placeholder="Kettle & Co. cold brew" onChange={(e) => update({ product: e.target.value })} />
        <Field label="Ad title" name="title" value={p.title} maxLength={80} onChange={(e) => update({ title: e.target.value })} />
        <TextArea
          label="What it does"
          name="pitch"
          rows={2}
          maxLength={320}
          className="sm:col-span-2"
          placeholder="One plain sentence about why someone buys it."
          value={p.pitch}
          onChange={(e) => update({ pitch: e.target.value })}
        />
        <Field label="Audience" name="audience" value={p.audience} maxLength={120} placeholder="Who is watching" onChange={(e) => update({ audience: e.target.value })} />
        <Field label="Offer" name="offer" value={p.offer} maxLength={140} placeholder="What they get" onChange={(e) => update({ offer: e.target.value })} />
      </div>

      <Group label="Angle" hint={angle?.hint}>
        <div className="flex flex-wrap gap-2">
          {ANGLES.map((a) => (
            <Chip key={a.id} selected={p.angle === a.id} onClick={() => update({ angle: a.id })}>
              {a.label}
            </Chip>
          ))}
        </div>
      </Group>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="language" className="mb-2 block font-mono text-xs text-muted">
            Language
          </label>
          <select
            id="language"
            value={p.language}
            onChange={(e) => update({ language: e.target.value as LanguageId })}
            className="min-h-12 rounded-lg border border-line bg-white px-4 text-[17px] transition-colors duration-300 focus:border-ink focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          loading={write.isPending && write.variables === "full"}
          disabled={!p.product.trim() || write.isPending}
          onClick={() => write.mutate("full")}
        >
          {s.hook ? "Rewrite with AI" : "Write the script"}
        </Button>
        <Button
          variant="secondary"
          loading={write.isPending && write.variables === "hooks"}
          disabled={!p.product.trim() || !s.hook || write.isPending}
          onClick={() => write.mutate("hooks")}
        >
          New hooks
        </Button>
      </div>
      {!p.product.trim() && <p className="-mt-4 text-sm text-muted">Name the product to let the writer draft it, or type your own lines below.</p>}
      {write.error && <Notice>{errorMessage(write.error)}</Notice>}

      {options.length > 1 && (
        <div role="radiogroup" aria-label="Opening hook" className="flex flex-col gap-2">
          <Mono className="mb-1 block">Opening hook</Mono>
          {options.map((hook, i) => (
            <OptionCard key={hook} selected={hook === s.hook} onSelect={() => pickHook(hook)} label={hook === s.hook ? "In use" : `Option ${"ABC"[i] ?? i}`}>
              <span className="text-[19px] leading-snug tracking-[-0.3px]">{hook}</span>
            </OptionCard>
          ))}
        </div>
      )}

      <TextArea label="Hook" name="hook" rows={2} maxLength={220} value={s.hook} onChange={(e) => setLine("hook", e.target.value)} aside={<Mono>{s.hook.length}/220</Mono>} />
      <TextArea label="Body" name="body" rows={4} maxLength={600} value={s.body} onChange={(e) => setLine("body", e.target.value)} aside={<Mono>{s.body.length}/600</Mono>} />
      <TextArea label="Call to action" name="cta" rows={2} maxLength={200} value={s.cta} onChange={(e) => setLine("cta", e.target.value)} aside={<Mono>{s.cta.length}/200</Mono>} />
      <Mono>
        {plural(words, "word")} · about {spokenSeconds(words)}s spoken
      </Mono>
    </div>
  );
}

/* 002 Cast ----------------------------------------------------------------------------------- */

export function StepCast({ project: p, update, flush, replace }: StepProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const blob = await compressImage(file);
      const form = new FormData();
      form.append("image", blob, "product.jpg");
      await flush();
      return api<{ project: Project }>(`/api/projects/${p.id}/product-image`, { method: "PUT", form });
    },
    onSuccess: ({ project }) => replace(project),
  });
  const remove = useMutation({
    mutationFn: () => api<{ project: Project }>(`/api/projects/${p.id}/product-image`, { method: "DELETE" }),
    onSuccess: ({ project }) => replace(project),
  });

  return (
    <div className="flex flex-col gap-10">
      <div role="radiogroup" aria-label="Creator" className="flex flex-wrap gap-2">
        {CREATORS.map((c) => {
          const selected = p.creatorId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => update({ creatorId: c.id })}
              className={cn(
                "tile-zoom flex min-w-0 flex-[1_1_150px] flex-col gap-3 rounded-lg border bg-white p-2 pb-4 text-left transition-colors duration-300",
                selected ? "border-ink" : "border-line hover:border-ink",
              )}
            >
              <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-md bg-hair">
                <img src={c.portrait} alt="" className="tile-media absolute inset-0 size-full object-cover" loading="lazy" />
                {selected && (
                  <span className="absolute right-2 top-2">
                    <CheckBadge />
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-0.5 px-2">
                <span className="text-base font-medium">{c.name}</span>
                <span className="text-sm text-muted">{c.role}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Group label="Scene" hint={getScene(p.sceneId).detail}>
        <div className="flex flex-wrap gap-2">
          {SCENES.map((scene) => (
            <Chip key={scene.id} selected={p.sceneId === scene.id} onClick={() => update({ sceneId: scene.id })} className="flex items-center gap-2.5 pl-1.5">
              <img src={scene.image} alt="" className="size-8 rounded object-cover" />
              {scene.label}
            </Chip>
          ))}
        </div>
      </Group>

      <div role="radiogroup" aria-label="Format" className="flex flex-col gap-2">
        <Mono className="mb-1 block">Format</Mono>
        {FORMATS.map((format) => (
          <OptionCard key={format.id} selected={p.format === format.id} onSelect={() => update({ format: format.id })} label={format.label}>
            <span className="text-[17px] leading-snug">{format.detail}</span>
          </OptionCard>
        ))}
      </div>

      <Group label="Product photo" hint="Sent to the video model when the format is “Product in frame”. JPEG, PNG or WebP.">
        <div className="flex flex-wrap items-center gap-4">
          {p.productImageUrl ? (
            <img src={apiUrl(p.productImageUrl)} alt="Product" className="size-24 rounded-lg border border-line object-cover" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-lg border border-dashed border-line font-mono text-xs text-muted">No photo</span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Upload product photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" loading={upload.isPending} onClick={() => fileInput.current?.click()}>
            {p.productImageUrl ? "Replace photo" : "Add a photo"}
          </Button>
          {p.productImageUrl && (
            <Button variant="ghost" loading={remove.isPending} onClick={() => remove.mutate()}>
              Remove
            </Button>
          )}
        </div>
        {(upload.error || remove.error) && (
          <div className="mt-3">
            <Notice>{errorMessage(upload.error ?? remove.error)}</Notice>
          </div>
        )}
      </Group>
    </div>
  );
}

/* 003 Hear ----------------------------------------------------------------------------------- */

export function StepHear({
  project: p,
  update,
  flush,
  voice,
  voiceKey,
  onBack,
}: StepProps & { voice: Voice; voiceKey: string; onBack: () => void }) {
  const credits = useCredits();
  const text = joinScript(p.script);
  const current = Boolean(voice.take) && voice.key === voiceKey;
  const cues = current ? voice.take!.cues : [];
  const duration = current ? voice.take!.duration : 0;
  const listening = current && (voice.phase === "playing" || voice.phase === "paused");
  const index = listening ? activeWordIndex(cues, voice.time) : -1;
  const words = cues.length ? cues.map((c) => c.word) : text.split(/\s+/).filter(Boolean);
  const creator = getCreator(p.creatorId);

  if (!text) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice tone="info">There's nothing to read yet. Write the hook, body and call to action first.</Notice>
        <Button variant="secondary" onClick={onBack}>
          Back to Write
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-7 rounded-lg border border-line p-7">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => void voice.play(voiceKey, flush)}
            aria-label={voice.phase === "playing" && current ? "Pause" : "Play the cut"}
            className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-300 hover:bg-ink-hover disabled:opacity-60"
            disabled={voice.phase === "loading"}
          >
            {voice.phase === "loading" ? <Spinner className="size-5" /> : voice.phase === "playing" && current ? <PauseIcon /> : <PlayIcon />}
          </button>
          <Waveform progress={duration ? voice.time / duration : 0} live={voice.phase === "playing"} />
          <span className="shrink-0 font-mono text-[13px] text-muted">
            {clock(current ? voice.time : 0)} / {clock(duration || spokenSeconds(words.length))}
          </span>
        </div>
        <p className="min-h-[92px] text-[clamp(26px,3vw,38px)] leading-[1.2] tracking-[-1.5px]" aria-live="off">
          {words.map((word, i) => (
            <span
              key={`${i}-${word}`}
              className={cn(
                "mr-[0.24em] inline-block transition-[color,transform] duration-300",
                index >= 0 && i > index ? "text-soft" : "text-ink",
                i === index && "-translate-y-[3px] underline decoration-1 underline-offset-8",
              )}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
      {voice.error && <Notice>{voice.error}</Notice>}
      {voice.take && !current && <Notice tone="info">You changed the script or the voice. Press play to hear the new version.</Notice>}

      <Group label="Pace">
        <div className="flex flex-wrap gap-2">
          {SPEEDS.map((speed) => (
            <Chip key={speed.id} selected={p.speed === speed.id} onClick={() => update({ speed: speed.id })}>
              {speed.label}
            </Chip>
          ))}
        </div>
      </Group>
      <Mono>
        Voice: {creator.name}
        {credits.data && ` · voice previews today ${credits.data.usage.voices.used}/${credits.data.usage.voices.limit}`}
        {" · replays are free"}
      </Mono>
    </div>
  );
}

/* 004 Ship ----------------------------------------------------------------------------------- */

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function StepShip({
  project: p,
  update,
  flush,
  clip,
  onClip,
}: StepProps & { clip: Video | null; onClip: (id: string) => void }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const videos = useVideos();
  const start = useMutation({
    mutationFn: async () => {
      await flush();
      return api<{ video: Video }>(`/api/projects/${p.id}/videos`, { method: "POST" });
    },
    onSuccess: ({ video }) => {
      qc.setQueryData(qk.video(video.id), video);
      onClip(video.id);
      refreshCredits(qc);
      void qc.invalidateQueries({ queryKey: qk.videos });
      void qc.invalidateQueries({ queryKey: qk.projects });
    },
  });

  const status = clip?.status;
  const settled = useRef<string | null>(null);
  useEffect(() => {
    if (!clip || clip.status === "pending" || settled.current === clip.id + clip.status) return;
    settled.current = clip.id + clip.status;
    refreshCredits(qc);
    void qc.invalidateQueries({ queryKey: qk.videos });
    void qc.invalidateQueries({ queryKey: qk.projects });
  }, [clip, qc]);

  const now = useNow(status === "pending");
  const credits = me?.credits ?? 0;
  const hookReady = p.script.hook.trim().length >= 8;
  const rendering = status === "pending";
  const others = (videos.data ?? []).filter((v) => v.projectId === p.id && v.id !== clip?.id);
  const creator = getCreator(p.creatorId);

  const rows: [string, string][] = [
    ["Product", p.product || "—"],
    ["Hook", p.script.hook || "—"],
    ["Creator", `${creator.name} · ${creator.role}`],
    ["Scene", getScene(p.sceneId).label],
    ["Format", FORMATS.find((f) => f.id === p.format)?.label ?? p.format],
  ];

  return (
    <div className="flex flex-col gap-8">
      <dl className="max-w-[680px] border-t border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line py-4">
            <dt className="w-[120px] shrink-0 pt-1 font-mono text-xs text-muted">{label}</dt>
            <dd className="min-w-0 flex-[1_1_240px] text-lg">{value}</dd>
          </div>
        ))}
      </dl>

      <Group label="Aspect">
        <div className="flex flex-wrap gap-2">
          {ASPECTS.map((aspect) => (
            <Chip key={aspect.id} selected={p.aspect === aspect.id} onClick={() => update({ aspect: aspect.id })}>
              {aspect.label}
            </Chip>
          ))}
        </div>
      </Group>

      <div className="flex max-w-[680px] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button arrow={!rendering} loading={start.isPending} disabled={credits < 1 || rendering || !hookReady} onClick={() => start.mutate()}>
            {rendering ? "Rendering…" : status === "ready" ? "Generate another take" : "Generate 6s clip"}
          </Button>
          <Mono>{plural(credits, "credit")} left · this uses 1</Mono>
        </div>
        {!hookReady && <p className="text-sm text-muted">Write a hook of at least a few words first.</p>}
        {credits < 1 && !rendering && (
          <Notice tone="info">
            You're out of credits. Paid plans are on the way.{" "}
            <Link to="/app/account" className="underline">
              See your account
            </Link>
            .
          </Notice>
        )}
        {start.error && <Notice>{errorMessage(start.error)}</Notice>}

        {clip && rendering && (
          <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
            <div className="flex justify-between gap-4 text-[15px]">
              <span>Rendering your 6s take</span>
              <Mono>{clock((now - new Date(clip.createdAt).getTime()) / 1000)}</Mono>
            </div>
            <Progress value={null} />
            <p className="text-sm text-muted">Usually one to three minutes. You can leave this page; it will be in your Library.</p>
          </div>
        )}
        {clip?.status === "ready" && clip.url && (
          <Notice tone="ok">
            Your take is ready — it's playing in the preview.{" "}
            <a href={apiUrl(`${clip.url}?download=1`)} className="underline">
              Download mp4
            </a>
          </Notice>
        )}
        {clip?.status === "failed" && <Notice>{clip.error ?? "The clip didn't finish. Your credit was refunded."}</Notice>}
      </div>

      {others.length > 0 && (
        <Group label="Earlier takes">
          <ul className="max-w-[680px] border-t border-line">
            {others.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-[15px]">
                <span className="min-w-0 truncate">
                  <Mono className="mr-3">{timeAgo(v.createdAt)}</Mono>
                  {v.status === "ready" ? "Ready" : v.status === "pending" ? "Rendering" : "Failed"}
                </span>
                {v.status === "ready" && (
                  <span className="flex gap-4">
                    <button type="button" className="uline" onClick={() => onClip(v.id)}>
                      Watch
                    </button>
                    <a href={apiUrl(`${v.url}?download=1`)} className="uline">
                      Download
                    </a>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Group>
      )}
    </div>
  );
}
