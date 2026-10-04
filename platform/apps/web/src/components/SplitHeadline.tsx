import type { ElementType } from "react";
import { cn } from "../lib/cn";

export type HeadlinePart = { text: string; strong?: boolean };

type Props = {
  parts: HeadlinePart[];
  as?: ElementType;
  className?: string;
  /** Seconds before the first letter rises. */
  delay?: number;
  /** Seconds between letters. */
  step?: number;
};

/**
 * Two-tone headline whose letters rise one by one (18px, expo ease).
 * Strong parts are ink, the rest soft gray. Screen readers get the plain sentence.
 */
export function SplitHeadline({ parts, as: Tag = "h1", className, delay = 0.15, step = 0.022 }: Props) {
  const label = parts.map((p) => p.text).join(" ");
  const words = parts.flatMap((part) =>
    part.text
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word, strong: Boolean(part.strong) })),
  );
  let index = 0;
  return (
    <Tag className={cn("split-headline font-normal leading-none tracking-[-2.5px]", className)} aria-label={label}>
      <span aria-hidden="true">
        {words.map(({ word, strong }, wi) => (
          <span key={wi} className="mr-[0.24em] inline-block whitespace-nowrap">
            {Array.from(word).map((char, ci) => (
              <span
                key={ci}
                className={cn("letter", strong ? "text-ink" : "split-soft text-soft")}
                style={{ animationDelay: `${(delay + index++ * step).toFixed(3)}s` }}
              >
                {char}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
