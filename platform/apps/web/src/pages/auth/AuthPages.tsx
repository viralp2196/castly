import { zodResolver } from "@hookform/resolvers/zod";
import { forgotSchema, getCreator, loginSchema, registerSchema, resetSchema } from "@castly/shared";
import type { ReactNode } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { Link, Navigate, Outlet, useNavigate, useParams, useSearchParams } from "react-router";
import { Wordmark } from "../../components/Headers";
import { SplitHeadline, type HeadlinePart } from "../../components/SplitHeadline";
import { Button, Field, Notice } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
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

function AuthShell({ headline, children, creatorId }: { headline: HeadlinePart[]; children: ReactNode; creatorId: string }) {
  const creator = getCreator(creatorId);
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-hair px-4 py-4">
        <div className="mx-auto flex max-w-[1440px] items-end justify-between gap-4">
          <div className="flex flex-col">
            <Wordmark />
            <span className="mt-1 text-[15px] text-muted">— A bench for UGC-style ads</span>
          </div>
          <Link to="/" className="text-lg text-muted transition-colors duration-300 hover:text-ink">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1440px] gap-1 px-4 py-10 lg:grid-cols-2 lg:py-4">
        <div className="flex flex-col justify-end gap-10 lg:min-h-[680px] lg:py-16 lg:pr-16">
          <SplitHeadline parts={headline} className="max-w-[560px] text-[clamp(36px,5.5vw,64px)]" />
          <div className="fade-up max-w-[460px]" style={{ animationDelay: ".6s" }}>
            {children}
          </div>
        </div>
        <div className="fade-up hidden lg:block" style={{ animationDelay: ".3s" }}>
          <div className="relative h-full min-h-[600px] overflow-hidden rounded-lg bg-sky">
            <img src={creator.portrait} alt="" className="drift absolute inset-0 size-full object-cover" />
            <span className="absolute left-4 top-4 rounded-md bg-white px-2.5 py-1.5 font-mono text-[13px]">Voice · {creator.name.split(" ")[0]}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export function RegisterPage() {
  const { register: signUp } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", password: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp.mutateAsync(values);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
    }
  });

  return (
    <AuthShell creatorId="aisha" headline={[{ text: "Start", strong: true }, { text: "your bench." }]}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Name" autoComplete="name" error={errors.name?.message} {...form.register("name")} />
        <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...form.register("password")}
        />
        {errors.root?.message && <Notice>{errors.root.message}</Notice>}
        <Button type="submit" arrow loading={form.formState.isSubmitting} className="self-start">
          Create account
        </Button>
        <p className="text-[15px] text-muted">
          Already have an account?{" "}
          <Link to="/login" className="uline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      navigate(safeNext(params.get("next")), { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
    }
  });

  return (
    <AuthShell creatorId="maya" headline={[{ text: "Welcome", strong: true }, { text: "back to the bench." }]}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
        <Field label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...form.register("password")} />
        {errors.root?.message && <Notice>{errors.root.message}</Notice>}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button type="submit" arrow loading={form.formState.isSubmitting}>
            Sign in
          </Button>
          <Link to="/forgot" className="uline text-[15px]">
            Forgot your password?
          </Link>
        </div>
        <p className="text-[15px] text-muted">
          New to Castly?{" "}
          <Link to="/register" className="uline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function ForgotPage() {
  const { forgot } = useSession();
  const form = useForm({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await forgot.mutateAsync(values);
    } catch (err) {
      applyServerErrors(form.setError, err);
    }
  });

  return (
    <AuthShell creatorId="noah" headline={[{ text: "Reset", strong: true }, { text: "your password." }]}>
      {forgot.isSuccess ? (
        <div className="flex flex-col gap-5">
          <Notice tone="ok">If that email has an account, a reset link is on its way. It works once and expires in an hour.</Notice>
          {import.meta.env.DEV && <p className="font-mono text-xs text-muted">Local dev without SMTP: the link is printed in the API terminal.</p>}
          <Link to="/login" className="uline text-[15px]">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <Field label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
          {errors.root?.message && <Notice>{errors.root.message}</Notice>}
          <Button type="submit" arrow loading={form.formState.isSubmitting} className="self-start">
            Send reset link
          </Button>
          <Link to="/login" className="uline text-[15px]">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPage() {
  const { reset } = useSession();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const form = useForm({ resolver: zodResolver(resetSchema), defaultValues: { token, password: "" } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await reset.mutateAsync(values);
      navigate("/app", { replace: true });
    } catch (err) {
      applyServerErrors(form.setError, err);
    }
  });

  return (
    <AuthShell creatorId="kenji" headline={[{ text: "Choose", strong: true }, { text: "a new password." }]}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <input type="hidden" {...form.register("token")} />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters. Signs you out on other devices."
          error={errors.password?.message}
          {...form.register("password")}
        />
        {(errors.root?.message || errors.token?.message) && (
          <Notice>
            {errors.root?.message || "This reset link is invalid."}{" "}
            <Link to="/forgot" className="underline">
              Ask for a new one
            </Link>
            .
          </Notice>
        )}
        <Button type="submit" arrow loading={form.formState.isSubmitting} className="self-start">
          Save and sign in
        </Button>
      </form>
    </AuthShell>
  );
}
