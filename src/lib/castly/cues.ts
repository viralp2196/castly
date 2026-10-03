import type { WordCue } from "./types";

export function cuesFromTimestamps(
  chars: string[],
  times: number[][],
  duration: number,
  text: string,
): WordCue[] {
  if (chars.length > 0 && times.length === chars.length) {
    const words: WordCue[] = [];
    let buf = "";
    let start = 0;
    let end = 0;
    const flush = () => {
      const word = buf.trim();
      if (word) words.push({ word, start, end: Math.max(end, start + 0.04) });
      buf = "";
    };
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i] ?? "";
      const span = times[i] ?? [end, end];
      const s = Number(span[0] ?? end);
      const e = Number(span[1] ?? s);
      if (/\s/.test(ch)) {
        flush();
        continue;
      }
      if (!buf) start = s;
      buf += ch;
      end = Number.isFinite(e) ? e : end;
    }
    flush();
    if (words.length) return words;
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return [];
  const weights = parts.map((word) => Math.max(1, word.length));
  const total = weights.reduce((sum, n) => sum + n, 0);
  const span = Math.max(duration, parts.length * 0.28);
  let cursor = 0;
  return parts.map((word, i) => {
    const wordStart = cursor;
    cursor += (weights[i] / total) * span;
    return { word, start: wordStart, end: cursor };
  });
}

export function activeWordIndex(cues: WordCue[], time: number) {
  if (!cues.length) return -1;
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (time >= cue.start && time < cue.end) return i;
  }
  for (let i = 0; i < cues.length; i++) {
    if (time < cues[i].start) return Math.max(0, i - 1);
  }
  return cues.length - 1;
}

export function captionWindow(cues: WordCue[], index: number) {
  if (index < 0 || !cues.length) return { words: [] as WordCue[], start: 0 };
  const start = Math.floor(index / 4) * 4;
  return { words: cues.slice(start, start + 4), start };
}
