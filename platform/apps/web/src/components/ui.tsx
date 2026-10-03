import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "../lib/cn";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "group inline-flex items-center justify-center gap-2.5 rounded-lg text-[17px] font-medium transition-colors duration-300 ease-[var(--ease-std)] disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "min-h-12 bg-ink px-5 text-white hover:bg-ink-hover",
  secondary: "min-h-12 border border-line bg-white px-5 text-ink hover:border-ink",
  ghost: "min-h-11 px-2 text-muted hover:text-ink",
};

export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("transition-transform duration-300 ease-[var(--ease-std)] group-hover:translate-x-[3px]", className)}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 rounded-full border-2 border-current border-r-transparent", className)}
      style={{ animation: "spin .8s linear infinite" }}
    />
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; loading?: boolean; arrow?: boolean };

export function Button({ variant = "primary", loading, arrow, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
      {arrow && !loading && <ArrowIcon />}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  arrow,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; arrow?: boolean }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...rest}>
      {children}
      {arrow && <ArrowIcon />}
    </Link>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs text-muted", className)}>{children}</span>;
}

const control =
  "w-full rounded-lg border bg-white px-4 text-[17px] text-ink transition-colors duration-300 placeholder:text-soft focus:border-ink focus:outline-none";

type FieldProps = ComponentProps<"input"> & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, id, className, ...rest }: FieldProps) {
  const fieldId = id ?? rest.name;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-2 block font-mono text-xs text-muted">
        {label}
      </label>
      <input
        id={fieldId}
        className={cn(control, "min-h-12", error ? "border-danger" : "border-line")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type AreaProps = ComponentProps<"textarea"> & { label: string; error?: string; aside?: ReactNode };

export function TextArea({ label, error, aside, id, className, ...rest }: AreaProps) {
  const fieldId = id ?? rest.name;
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="font-mono text-xs text-muted">
          {label}
        </label>
        {aside}
      </div>
      <textarea
        id={fieldId}
        className={cn(control, "py-3 leading-relaxed", error ? "border-danger" : "border-line")}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Chip({ selected, className, ...rest }: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "min-h-11 rounded-lg border px-4 text-base transition-colors duration-300 ease-[var(--ease-std)]",
        selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
        className,
      )}
      {...rest}
    />
  );
}

export function Notice({ tone = "error", children }: { tone?: "error" | "info" | "ok"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-[15px] leading-relaxed",
        tone === "error" && "border-danger/30 bg-[#fef3f2] text-danger",
        tone === "info" && "border-line bg-subtle text-ink",
        tone === "ok" && "border-ok/30 bg-[#ecfdf3] text-ok",
      )}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[clamp(20px,1.8vw,24px)] leading-normal tracking-[-0.64px]", className)}>{children}</p>;
}

export function Progress({ value }: { value: number | null }) {
  return (
    <div className="relative h-0.5 w-full overflow-hidden bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
      {value === null ? (
        <div className="absolute inset-y-0 left-0 w-2/5 bg-ink" style={{ animation: "sweep 1.6s var(--ease-std) infinite" }} />
      ) : (
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${Math.round(value * 100)}%` }} />
      )}
    </div>
  );
}

export function CheckBadge() {
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-ink" style={{ animation: "pop .35s var(--ease-expo) both" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

export function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 4.5l12 7.5-12 7.5z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4.5" height="15" rx="1" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1" />
    </svg>
  );
}
