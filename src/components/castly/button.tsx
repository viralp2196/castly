import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-primary text-primary-ink",
  ghost: "border border-border bg-surface text-fg",
  brass: "bg-brass text-brass-ink",
  quiet: "bg-transparent text-muted",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
