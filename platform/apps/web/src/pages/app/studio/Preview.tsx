import { activeWordIndex, getAspect, getCreator, getScene, type Project, type Video } from "@castly/shared";
import { useReducedMotion } from "../../../components/Reveal";
import { apiUrl } from "../../../lib/api";
import { cn } from "../../../lib/cn";
import type { Voice } from "./useVoice";

type CaptionWord = { word: string; state: "plain" | "spoken" | "current" | "upcoming" };

/** Words for the on-screen caption: a 6-word window that follows the voice, or the hook when idle. */
function captionWords(project: Project, voice: Voice, voiceKey: string): CaptionWord[] {
  const live = voice.take && voice.key === voiceKey && (voice.phase === "playing" || voice.phase === "paused");
  if (live && voice.take!.cues.length) {
    const cues = voice.take!.cues;
    const index = Math.max(0, activeWordIndex(cues, voice.time));
    const start = Math.floor(index / 6) * 6;
    return cues.slice(start, start + 6).map((cue, i) => ({
      word: cue.word,
      state: start + i < index ? "spoken" : start + i === index ? "current" : "upcoming",
    }));
  }
  const hook = project.script.hook.trim() || "Your hook shows up here.";
  return hook.split(/\s+/).map((word) => ({ word, state: "plain" }));
}

export function Preview({
  project,
  voice,
  voiceKey,
  clip,
}: {
  project: Project;
  voice: Voice;
  voiceKey: string;
  /** A finished clip to play instead of the live mock (Ship step). */
  clip: Video | null;
}) {
  const creator = getCreator(project.creatorId);
  const scene = getScene(project.sceneId);
  const aspect = getAspect(project.aspect);
  const reduced = useReducedMotion();
  const [w, h] = aspect.css.split("/").map((n) => Number(n.trim()));
  const words = captionWords(project, voice, voiceKey);
  const showClip = clip?.status === "ready" && clip.url;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between font-mono text-xs text-muted">
        <span>{showClip ? "Generated take" : "Live preview"}</span>
        <span>{aspect.label}</span>
      </div>
      <div
        className="relative mx-auto w-full overflow-hidden rounded-lg bg-hair transition-[width] duration-500"
        style={{ aspectRatio: aspect.css, width: `min(100%, calc(72vh * ${w} / ${h}))` }}
      >
        {showClip ? (
          <video key={clip.id} className="absolute inset-0 size-full bg-ink object-cover" src={apiUrl(clip.url!)} controls autoPlay playsInline />
        ) : (
          <>
            {creator.loop && !reduced ? (
              <video
                key={creator.id}
                className="drift absolute inset-0 size-full object-cover"
                src={creator.loop}
                poster={creator.portrait}
                autoPlay
                muted
                loop
                playsInline
                aria-hidden="true"
              />
            ) : (
              <img key={creator.id} className="fade-up absolute inset-0 size-full object-cover" src={creator.portrait} alt="" />
            )}
            <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1.5 font-mono text-xs">Voice · {creator.name.split(" ")[0]}</span>
            <span className="absolute right-3 top-3 rounded-md bg-white px-2.5 py-1.5 font-mono text-xs">{scene.label}</span>
            {project.format === "in-hand" && project.productImageUrl && (
              <img
                src={apiUrl(project.productImageUrl)}
                alt="Product in frame"
                className="absolute right-3 top-14 size-16 rounded-md border-2 border-white object-cover shadow-sm"
              />
            )}
            <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white px-4 py-3.5 text-[clamp(16px,1.6vw,20px)] font-medium leading-snug tracking-[-0.4px]">
              {words.map((item, i) => (
                <span
                  key={`${i}-${item.word}`}
                  className={cn(
                    "transition-colors duration-300",
                    item.state === "upcoming" ? "text-soft" : "text-ink",
                    item.state === "current" && "underline decoration-1 underline-offset-[6px]",
                  )}
                >
                  {item.word}{" "}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-sm text-muted">Every choice shows up here first.</p>
    </div>
  );
}
