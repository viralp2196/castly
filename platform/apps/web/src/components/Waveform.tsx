import { useMemo } from "react";
import { cn } from "../lib/cn";

/** Decorative waveform: bars fill ink up to `progress` and pulse while `live`. */
export function Waveform({
  progress,
  live,
  bars = 44,
  height = 72,
  className,
}: {
  progress: number;
  live: boolean;
  bars?: number;
  height?: number;
  className?: string;
}) {
  const heights = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) =>
        Math.round((0.22 + ((Math.sin(i * 1.7) + Math.sin(i * 0.63 + 1)) * 0.25 + 0.5) * 0.72) * height),
      ),
    [bars, height],
  );
  return (
    <div className={cn("flex min-w-0 flex-1 items-center justify-between gap-[3px]", className)} style={{ height }} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn("wave-bar block min-w-[2px] max-w-[6px] flex-1 rounded-sm transition-colors duration-200", live && "is-live")}
          style={{
            height: h,
            background: i < progress * bars ? "var(--color-ink)" : "var(--color-track)",
            animationDelay: `${((i % 11) * 0.07).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
