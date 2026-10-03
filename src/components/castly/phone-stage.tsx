import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { getCreator, getScene, wordCount } from "@/lib/castly/catalog";
import { activeWordIndex, captionWindow } from "@/lib/castly/cues";
import type { useSpokenCut } from "@/lib/castly/use-spoken";
import type { AdProject } from "@/lib/castly/types";
import { cn } from "@/lib/utils";

type Spoken = ReturnType<typeof useSpokenCut>;

function clock(value: number) {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const seconds = Math.floor(safe);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PhoneStage({
  project,
  spoken,
  onPrimary,
  showGenerated = false,
  rendering = false,
}: {
  project: AdProject;
  spoken: Spoken;
  onPrimary: () => void;
  showGenerated?: boolean;
  rendering?: boolean;
}) {
  const creator = getCreator(project.creatorId);
  const scene = getScene(project.sceneId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { phase, cues, time, duration } = spoken;
  const moving = phase === "playing" || phase === "paused";
  const index = moving ? activeWordIndex(cues, time) : -1;
  const line = moving ? captionWindow(cues, Math.max(index, 0)) : null;
  const hookWords = wordCount(project.script.hook);
  const bodyWords = wordCount(project.script.body);
  const showScene =
    project.format === "hook-broll" &&
    index >= hookWords &&
    index < hookWords + bodyWords &&
    bodyWords > 0;
  const frame =
    project.aspect === "square" ? "frame-square" : project.aspect === "wide" ? "frame-wide" : "frame-story";
  const width =
    project.aspect === "wide" ? "max-w-xl" : project.aspect === "square" ? "max-w-sm" : "max-w-xs";
  const captionClass =
    project.captionStyle === "clean"
      ? "text-lg font-medium"
      : project.captionStyle === "lower"
        ? "text-left text-base font-medium"
        : "text-center text-2xl font-semibold caption-punch";

  const clip = showGenerated && project.cutVideo ? project.cutVideo : "";
  const [sound, setSound] = useState(false);

  useEffect(() => {
    setSound(false);
  }, [clip]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (phase === "playing") void video.play().catch(() => undefined);
  }, [phase, creator.loop, clip]);

  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const label =
    phase === "loading" ? "Casting the voice" : phase === "playing" ? "Pause" : phase === "paused" ? "Resume" : "Hear this cut";

  return (
    <div className={cn("mx-auto w-full", width)}>
      <div className="rounded-xl bg-surface-3 p-1.5">
        <div className={cn("relative overflow-hidden rounded-lg bg-surface", frame)}>
          <div className={cn("absolute inset-0 transition-opacity duration-300", showScene && !clip ? "opacity-0" : "opacity-100")}>
            {clip || creator.loop ? (
              <video
                ref={videoRef}
                src={clip || creator.loop}
                poster={creator.portrait}
                muted={!clip || !sound || phase === "playing"}
                loop
                playsInline
                autoPlay
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={creator.portrait} alt={creator.name} className="ken-on h-full w-full object-cover" />
            )}
          </div>
          <img
            src={scene.image}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              showScene ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="scrim pointer-events-none absolute inset-0" />
          <div className="absolute inset-x-0 top-0 h-1 bg-surface-3">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <div className="absolute left-3 top-3 rounded-md bg-bg/70 px-2 py-1 text-xs text-fg">
            {clip ? "Generated cut" : creator.name}
          </div>
          {project.format === "in-hand" && project.productImage && !clip ? (
            <img
              src={project.productImage}
              alt={project.product || "Product"}
              className="absolute right-3 top-3 h-16 w-16 rounded-md border border-border object-cover"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 space-y-3 p-3">
            <div className={cn("min-h-16 text-fg", captionClass)} aria-live="polite">
              {line && line.words.length > 0 ? (
                line.words.map((cue, offset) => {
                  const wordIndex = line.start + offset;
                  const on = wordIndex === index;
                  return (
                    <span key={`${cue.start}-${cue.word}`} className={on ? "text-brass" : "text-fg"}>
                      {cue.word}{" "}
                    </span>
                  );
                })
              ) : (
                <span>{project.script.hook.trim() || "Your hook lands here."}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPrimary}
                disabled={phase === "loading"}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-fg px-3 text-sm font-medium text-bg disabled:opacity-60"
              >
                {phase === "playing" ? <Pause className="size-4" /> : <Play className="size-4" />}
                {label}
              </button>
              {clip ? (
                <button type="button" onClick={() => setSound((value) => !value)} className="min-h-11 text-sm text-fg">
                  {sound ? "Mute clip" : "Clip sound"}
                </button>
              ) : null}
              {phase === "playing" ? (
                <span className="eq flex items-end gap-1" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
              <span className="ml-auto text-sm tabular-nums text-fg">
                {clock(time)} / {clock(duration)}
              </span>
            </div>
          </div>
          {rendering ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/50">
              <p className="pulse-dot rounded-md bg-bg px-3 py-2 text-sm text-fg">Making a 6-second clip…</p>
            </div>
          ) : phase === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-bg/50">
              <p className="pulse-dot rounded-md bg-bg px-3 py-2 text-sm text-fg">Casting the voice…</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
