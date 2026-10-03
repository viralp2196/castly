import type { VoiceTake } from "@castly/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiUrl, errorMessage } from "../../../lib/api";
import { refreshCredits } from "../../../lib/queries";

export type VoicePhase = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Plays the project's voice take. Each distinct key (script + creator + speed) is
 * rendered once by the server; replays reuse the stored take for free.
 */
export function useVoice(projectId: string) {
  const qc = useQueryClient();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [key, setKey] = useState("");
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    audio.current = el;
    const onEnded = () => {
      setPhase("idle");
      setTime(0);
    };
    const onPause = () => setPhase((p) => (p === "playing" ? "paused" : p));
    el.addEventListener("ended", onEnded);
    el.addEventListener("pause", onPause);
    return () => {
      el.pause();
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("pause", onPause);
      el.removeAttribute("src");
      audio.current = null;
    };
  }, []);

  // Smooth caption timing while playing (timeupdate only fires ~4x a second).
  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const start = async (el: HTMLAudioElement) => {
    try {
      await el.play();
      setPhase("playing");
    } catch {
      setPhase("paused");
      setError("Your browser blocked playback. Press play again.");
    }
  };

  const play = useCallback(
    async (currentKey: string, beforeFetch?: () => Promise<void>) => {
      const el = audio.current;
      if (!el) return;
      setError(null);
      if (take && key === currentKey && el.src) {
        if (el.paused) await start(el);
        else el.pause();
        return;
      }
      setPhase("loading");
      try {
        await beforeFetch?.();
        const res = await api<{ take: VoiceTake; cached: boolean }>(`/api/projects/${projectId}/voice`, { json: {} });
        if (!res.cached) refreshCredits(qc);
        setTake(res.take);
        setKey(currentKey);
        el.src = apiUrl(res.take.url);
        el.currentTime = 0;
        setTime(0);
        await start(el);
      } catch (err) {
        setPhase("error");
        setError(errorMessage(err));
      }
    },
    [key, projectId, qc, take],
  );

  const stop = useCallback(() => {
    const el = audio.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setTime(0);
    setPhase((p) => (p === "loading" ? p : "idle"));
  }, []);

  return { take, key, phase, time, error, play, stop };
}

export type Voice = ReturnType<typeof useVoice>;
