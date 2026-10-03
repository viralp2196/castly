import type { CreditReason } from "@castly/shared";

export function timeAgo(iso: string, now = Date.now()) {
  const seconds = (now - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)} h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Rough spoken length for UGC pacing (~2.6 words per second). */
export function spokenSeconds(words: number) {
  return Math.round(words / 2.6);
}

export const REASON_LABEL: Record<CreditReason, string> = {
  signup_grant: "Welcome credits",
  video_debit: "Clip generated",
  video_refund: "Refund",
  admin_grant: "Granted",
  purchase: "Purchase",
};
