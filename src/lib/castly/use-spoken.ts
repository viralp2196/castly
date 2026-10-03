import { useEffect, useRef, useState } from "react";
import { speakAd } from "./ai";
import { cuesFromTimestamps } from "./cues";
import type { WordCue } from "./types";

export type SpokenPhase = "idle" | "loading" | "playing" | "paused" | "error";

type Bundle = { src: string; cues: WordCue[]; duration: number };

type SpeakInput = {
  text: string;
  voiceId: string;
  language: string;
  speed: number;
};

export function useSpokenCut() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cache = useRef(new Map<string, Bundle>());
  const swapping = useRef(false);
  const [activeKey, setActiveKey] = useState("");
  const [phase, setPhase] = useState<SpokenPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cues, setCues] = useState<WordCue[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnd = () => {
      setPhase("idle");
      setTime(0);
    };
    const onPause = () => {
      if (swapping.current) return;
      setPhase((current) => (current === "playing" ? "paused" : current));
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    if (audio.paused) {
      void audio.play().then(() => setPhase("playing")).catch(() => {
        setPhase("error");
        setError("Playback was blocked. Tap again.");
      });
    } else {
      audio.pause();
    }
  };

  const speak = async (input: SpeakInput) => {
    const text = input.text.trim();
    if (!text) {
      setPhase("error");
      setError("Write a line before you hear it.");
      return;
    }
    const key = `${input.voiceId}|${input.language}|${input.speed}|${text}`;
    setError(null);
    let bundle = cache.current.get(key);
    if (!bundle) {
      setPhase("loading");
      const result = await speakAd({
        data: {
          text,
          voiceId: input.voiceId,
          language: input.language,
          speed: input.speed,
        },
      });
      if (!result.ok) {
        setPhase("error");
        setError(result.error);
        return;
      }
      bundle = {
        src: `data:${result.contentType};base64,${result.audio}`,
        cues: cuesFromTimestamps(result.chars, result.times, result.duration, text),
        duration: result.duration,
      };
      cache.current.set(key, bundle);
    }
    setActiveKey(key);
    setCues(bundle.cues);
    setDuration(bundle.duration);
    const audio = audioRef.current;
    if (!audio) return;
    swapping.current = true;
    audio.pause();
    audio.src = bundle.src;
    audio.currentTime = 0;
    try {
      await audio.play();
      setPhase("playing");
      setTime(0);
    } catch {
      setPhase("error");
      setError("Playback was blocked. Tap again.");
    } finally {
      swapping.current = false;
    }
  };

  return { audioRef, phase, error, cues, time, duration, speak, toggle, activeKey };
}
