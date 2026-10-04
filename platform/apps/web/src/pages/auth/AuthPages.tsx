import { zodResolver } from "@hookform/resolvers/zod";
import { forgotSchema, getCreator, loginSchema, registerSchema, resetSchema } from "@castly/shared";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { Link, Navigate, Outlet, useNavigate, useParams, useSearchParams } from "react-router";
import { ApiError, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { useMe, useSession } from "../../lib/queries";
import { FullPageSpinner } from "../app/AppLayout";

/** Only same-app paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
}

function applyServerErrors<T extends FieldValues>(setError: UseFormSetError<T>, err: unknown) {
  if (err instanceof ApiError && Object.keys(err.fields).length) {
    for (const [name, message] of Object.entries(err.fields)) setError(name as Path<T>, { message });
    return;
  }
  setError("root" as Path<T>, { message: errorMessage(err) });
}

export function GuestOnly() {
  const me = useMe();
  if (me.isLoading) return <FullPageSpinner />;
  if (me.data) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/* Shared pieces -------------------------------------------------------------------------- */

const CAPTION_REGISTER = "I did not expect a can to taste this good.";
const CAPTION_LOGIN = "Okay, this cold brew just ended my 3pm slump.";

const BARS = Array.from({ length: 40 }, (_, i) => ({
  height: Math.round(6 + ((Math.sin(i * 1.7) + Math.sin(i * 0.63 + 1)) * 0.25 + 0.5) * 20),
  delay: `${((i % 9) * 0.08).toFixed(2)}s`,
}));

function Accent({ children }: { children: ReactNode }) {
  return <em className="font-serif font-normal italic tracking-[-0.01em] text-iris-soft">{children}</em>;
}

/** A tall photo panel that cross-fades between creators while their line plays as live captions. */
function CreatorStage({ creatorIds, caption, className }: { creatorIds: string[]; caption: string; className?: string }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % creatorIds.length), 4500);
    return () => clearInterval(timer);
  }, [creatorIds.length]);
  const creators = creatorIds.map(getCreator);
  const current = creators[slide]!;

  return (
    <div className={cn("blur-in relative min-h-[420px] overflow-hidden rounded-[36px] bg-night-3", className)} aria-hidden="true">
      {creators.map((creator, i) => (
        <img
          key={creator.id}
          src={creator.portrait}
          alt=""
          className="kenburns absolute inset-0 size-full object-cover transition-opacity duration-[1200ms] ease-[var(--ease-expo)]"
          style={{ opacity: i === slide ? 1 : 0, animationDelay: `${-i * 5}s` }}
        />
      ))}
      <div className="absolute inset-0 bg-night/15" />
      <span className="glass-dark absolute right-5 top-5 inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 font-mono text-xs tracking-[0.06em] text-white">
        <span className="size-[7px] rounded-full bg-[#ff6a3d]" style={{ animation: "pulse 1.4s ease-in-out infinite" }} />
        REC · {current.name.split(" ")[0]!.toUpperCase()}
      </span>
      <div className="glass-dark absolute inset-x-5 bottom-5 rounded-[26px] px-5 pb-5 pt-4 text-white">
        <div className="flex h-[26px] items-center justify-between gap-[3px]">
          {BARS.map((bar, i) => (
            <span key={i} className="wave-bar is-live block max-w-1 flex-1 rounded-sm bg-white" style={{ height: bar.height, animationDelay: bar.delay }} />
          ))}
        </div>
        <p className="mt-3 font-display text-[clamp(20px,2vw,26px)] font-semibold leading-snug tracking-[-0.01em]">
          {caption.split(" ").map((word, i) => (
            <span key={i} className="read-light" style={{ animationDelay: `${(i * 0.4).toFixed(2)}s` }}>
              {word}{" "}
            </span>
          ))}
        </p>
        <div className="mt-3.5 flex gap-1.5">
          {creators.map((creator, i) => (
            <span
              key={creator.id}
              className="h-1 rounded-full bg-white transition-all duration-500 ease-[var(--ease-expo)]"
              style={{ width: i === slide ? 28 : 10, opacity: i === slide ? 1 : 0.45 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthShell({
  stage,
  stageSide,
  topLink,
  children,
}: {
  stage: { creatorIds: string[]; caption: string };
  stageSide: "left" | "right";
  topLink: ReactNode;
  children: ReactNode;
}) {
  const stageEl = <CreatorStage creatorIds={stage.creatorIds} caption={stage.caption} className="hidden min-w-0 flex-[1_1_520px] lg:block" />;
  return (
    // Desktop: locked to the viewport so the photo panel never stretches or scrolls away; only the
    // form column scrolls if its content (errors, strength meter) outgrows the window. Phones scroll normally.
    <div className="auth-dark min-h-dvh bg-night font-sans text-white lg:h-dvh lg:overflow-hidden">
      <div className="flex min-h-dvh gap-4 p-4 lg:h-full lg:min-h-0">
        {stageSide === "left" && stageEl}
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-8 px-2 py-4 md:px-[clamp(8px,4vw,64px)] lg:overflow-y-auto">
          <div className="blur-in flex shrink-0 flex-wrap items-center justify-between gap-3 text-[15px] text-fog" style={{ animationDelay: ".15s" }}>
            <Link to="/" aria-label="Castly home" className="inline-flex items-center gap-1.5 font-display text-[22px] font-bold tracking-[-0.03em] text-white">
              castly<span className="size-[7px] rounded-full bg-iris" />
            </Link>
            {topLink}
          </div>
          <div className="mx-auto my-auto w-full max-w-[440px]">{children}</div>
          <p className="shrink-0 text-center font-mono text-xs tracking-[0.04em] text-dusk">NOTHING GENERATES UNTIL YOU PRESS THE BUTTON</p>
        </div>
        {stageSide === "right" && stageEl}
      </div>
    </div>
  );
}

function Heading({ children, sub }: { children: ReactNode; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(44px,4.6vw,64px)] font-semibold leading-[0.98] tracking-[-0.04em]">{children}</h1>
      <p className="mt-3.5 text-[17px] leading-[1.55] text-fog">{sub}</p>
    </div>
  );
}

type FloatFieldProps = ComponentProps<"input"> & { label: string; error?: string; hint?: string; trailing?: ReactNode };

/** Dark field whose label floats up on focus or once it has a value (pure CSS, works with uncontrolled inputs). */
function FloatField({ label, error, hint, trailing, id, ...rest }: FloatFieldProps) {
  const fieldId = id ?? rest.name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div>
      <div className="relative">
        <input
          id={fieldId}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer h-[62px] w-full rounded-[18px] border-[1.5px] bg-night-2 px-[18px] pb-2 pt-6 text-[17px] text-white transition-[border-color,box-shadow] duration-300 focus:outline-none focus:shadow-[0_0_0_4px_rgba(169,162,255,0.16)]",
            error ? "border-danger-soft focus:border-danger-soft" : "border-white/[0.12] focus:border-iris-soft",
            trailing ? "pr-16" : undefined,
          )}
          {...rest}
        />
        <label
          htmlFor={fieldId}
          className={cn(
            "pointer-events-none absolute left-[18px] top-[9px] text-xs transition-all duration-300 ease-[var(--ease-expo)] peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-[9px] peer-focus:text-xs",
            error ? "text-danger-soft" : "text-fog peer-focus:text-iris-soft",
          )}
        >
          {label}
        </label>
        {trailing}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="ml-1.5 mt-1.5 text-sm text-danger-soft">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="ml-1.5 mt-1.5 text-sm text-dusk">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-2 top-[9px] flex size-11 items-center justify-center rounded-xl text-fog transition-colors duration-300 hover:text-white"
    >
      {shown ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function SubmitButton({ busy, children, busyLabel }: { busy: boolean; children: ReactNode; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={busy || undefined}
      className="btn-spring mt-1.5 inline-flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-full bg-iris text-[17px] font-semibold text-white disabled:opacity-85"
    >
      {busy && <span aria-hidden="true" className="size-[18px] rounded-full border-2 border-white border-r-transparent" style={{ animation: "spin .8s linear infinite" }} />}
      {busy ? busyLabel : children}
    </button>
  );
}

function FormAlert({ tone = "error", children }: { tone?: "error" | "ok"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[18px] border px-4 py-3 text-[15px] leading-relaxed",
        tone === "error" ? "border-danger-soft/40 bg-danger-soft/10 text-danger-soft" : "border-iris-soft/40 bg-iris-soft/10 text-white",
      )}
    >
      {children}
    </div>
  );
}

/** Restarts a short horizontal shake each time the form is submitted with errors. */
function useShake() {
  const [count, setCount] = useState(0);
  const style = count === 0 ? undefined : { animation: `${count % 2 ? "shake-a" : "shake-b"} .5s cubic-bezier(.36,.07,.19,.97)` };
  return { style, shake: () => setCount((c) => c + 1) };
}

function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

const STRENGTH = [
  { label: "Too short", color: "#3a3c46" },
  { label: "Weak", color: "#ff8b7e" },
  { label: "Okay", color: "#f2b94b" },
  { label: "Good", color: "#a9a2ff" },
  { label: "Strong", color: "#5fd39b" },
];

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = strength(password);
  const level = STRENGTH[score]!;
  return (
    <div className="blur-in -mt-1 flex items-center gap-2.5" aria-live="polite">
      <div className="flex flex-1 gap-[5px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[5px] flex-1 rounded-full transition-colors duration-500" style={{ background: i < score ? level.color : "rgba(255,255,255,.1)" }} />
        ))}
      </div>
      <span className="min-w-[64px] text-right font-mono text-xs text-fog">{level.label}</span>
    </div>
  );
}

const linkStrong = "font-semibold text-white underline decoration-1 underline-offset-[3px]";

/* Screens -------------------------------------------------------------------------------- */

export function RegisterPage() {
  const { register: signUp } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [shown, setShown] = useState(false);
  const { style: shakeStyle, shake } = useShake();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });
  const errors = form.formState.errors;
  const password = form.watch("password");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp.mutateAsync(values);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
      shake();
    }
  }, shake);

  return (
    <AuthShell
      stageSide="left"
      stage={{ creatorIds: ["aisha", "priya", "kenji"], caption: CAPTION_REGISTER }}
      topLink={
        <span>
          Have an account?{" "}
          <Link to="/login" className={linkStrong}>
            Sign in
          </Link>
        </span>
      }
    >
      <div className="stagger flex flex-col gap-6">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 px-3.5 py-2 font-mono text-xs tracking-[0.06em] text-fog">
          <span className="size-[7px] rounded-full bg-iris-soft" />
          FREE CLIPS · NO CARD
        </span>
        <Heading sub="Write a line, cast a face, hear the cut. Your drafts save to your account as you type.">
          Start your <Accent>bench.</Accent>
        </Heading>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5" style={shakeStyle}>
          <FloatField label="Full name" autoComplete="name" error={errors.name?.message} {...form.register("name")} />
          <FloatField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
          <FloatField
            label="Password"
            type={shown ? "text" : "password"}
            autoComplete="new-password"
            hint={password ? undefined : "At least 8 characters."}
            error={errors.password?.message}
            trailing={<EyeToggle shown={shown} onToggle={() => setShown((s) => !s)} />}
            {...form.register("password")}
          />
          <StrengthMeter password={password} />
          {errors.root?.message && <FormAlert>{errors.root.message}</FormAlert>}
          <SubmitButton busy={form.formState.isSubmitting} busyLabel="Creating your bench…">
            Create account
          </SubmitButton>
        </form>
        <p className="text-center text-[15px] text-fog">
          Already on the bench?{" "}
          <Link to="/login" className={linkStrong}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [shown, setShown] = useState(false);
  const { style: shakeStyle, shake } = useShake();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
      shake();
    }
  }, shake);

  return (
    <AuthShell
      stageSide="right"
      stage={{ creatorIds: ["maya", "jordan", "noah"], caption: CAPTION_LOGIN }}
      topLink={
        <span>
          New to Castly?{" "}
          <Link to="/register" className={linkStrong}>
            Create an account
          </Link>
        </span>
      }
    >
      <div className="stagger flex flex-col gap-6">
        <Heading sub="Your cuts, voices and clips are right where you left them.">
          Welcome <Accent>back.</Accent>
        </Heading>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5" style={shakeStyle}>
          <FloatField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
          <FloatField
            label="Password"
            type={shown ? "text" : "password"}
            autoComplete="current-password"
            error={errors.password?.message}
            trailing={<EyeToggle shown={shown} onToggle={() => setShown((s) => !s)} />}
            {...form.register("password")}
          />
          <div className="-mt-1 flex justify-end">
            <Link to="/forgot" className="inline-flex min-h-11 items-center px-1 text-[15px] text-fog underline decoration-1 underline-offset-[3px] transition-colors duration-300 hover:text-white">
              Forgot your password?
            </Link>
          </div>
          {errors.root?.message && <FormAlert>{errors.root.message}</FormAlert>}
          <SubmitButton busy={form.formState.isSubmitting} busyLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <p className="text-center text-[15px] text-fog">
          New here?{" "}
          <Link to="/register" className={linkStrong}>
            Start with free clips
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function ForgotPage() {
  const { forgot } = useSession();
  const { style: shakeStyle, shake } = useShake();
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await forgot.mutateAsync(values);
    } catch (err) {
      applyServerErrors(form.setError, err);
      shake();
    }
  }, shake);

  return (
    <AuthShell
      stageSide="right"
      stage={{ creatorIds: ["noah", "sofia", "maya"], caption: CAPTION_LOGIN }}
      topLink={
        <Link to="/login" className={linkStrong}>
          Back to sign in
        </Link>
      }
    >
      <div className="stagger flex flex-col gap-6">
        <Heading sub="We'll email a link that works once and expires in an hour.">
          Reset your <Accent>password.</Accent>
        </Heading>
        {forgot.isSuccess ? (
          <div className="flex flex-col gap-4">
            <FormAlert tone="ok">If {form.getValues("email")} has an account, a reset link is on its way.</FormAlert>
            {import.meta.env.DEV && <p className="font-mono text-xs text-dusk">Local dev without SMTP: the link is printed in the API terminal.</p>}
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5" style={shakeStyle}>
            <FloatField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
            {errors.root?.message && <FormAlert>{errors.root.message}</FormAlert>}
            <SubmitButton busy={form.formState.isSubmitting} busyLabel="Sending…">
              Send reset link
            </SubmitButton>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export function ResetPage() {
  const { reset } = useSession();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);
  const { style: shakeStyle, shake } = useShake();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token, password: "" } });
  const errors = form.formState.errors;
  const password = form.watch("password");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values);
      navigate("/app", { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
      shake();
    }
  }, shake);

  return (
    <AuthShell
      stageSide="left"
      stage={{ creatorIds: ["kenji", "aisha", "jordan"], caption: CAPTION_REGISTER }}
      topLink={
        <Link to="/login" className={linkStrong}>
          Back to sign in
        </Link>
      }
    >
      <div className="stagger flex flex-col gap-6">
        <Heading sub="This signs you out on every other device.">
          Choose a new <Accent>password.</Accent>
        </Heading>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5" style={shakeStyle}>
          <input type="hidden" {...form.register("token")} />
          <FloatField
            label="New password"
            type={shown ? "text" : "password"}
            autoComplete="new-password"
            hint={password ? undefined : "At least 8 characters."}
            error={errors.password?.message}
            trailing={<EyeToggle shown={shown} onToggle={() => setShown((s) => !s)} />}
            {...form.register("password")}
          />
          <StrengthMeter password={password} />
          {(errors.root?.message || errors.token?.message) && (
            <FormAlert>
              {errors.root?.message || "This reset link is invalid."}{" "}
              <Link to="/forgot" className="underline">
                Ask for a new one
              </Link>
              .
            </FormAlert>
          )}
          <SubmitButton busy={form.formState.isSubmitting} busyLabel="Saving…">
            Save and sign in
          </SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
