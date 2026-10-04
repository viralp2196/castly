import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, profileSchema, type UsageMeter } from "@castly/shared";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { Reveal } from "../../components/Reveal";
import { SplitHeadline } from "../../components/SplitHeadline";
import { Button, Field, Mono, Notice, Progress, SectionLabel } from "../../components/ui";
import { ApiError, errorMessage } from "../../lib/api";
import { cn } from "../../lib/cn";
import { REASON_LABEL, dateTime } from "../../lib/format";
import { useAccount, useCredits, useMe, useSession } from "../../lib/queries";

function Meter({ label, meter }: { label: string; meter: UsageMeter }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[15px]">
        <span>{label}</span>
        <Mono>
          {meter.used} / {meter.limit} today
        </Mono>
      </div>
      <Progress value={meter.limit ? Math.min(1, meter.used / meter.limit) : 0} />
    </div>
  );
}

function ProfileForm({ name, email }: { name: string; email: string }) {
  const { profile } = useAccount();
  const form = useForm({ resolver: zodResolver(profileSchema), values: { name } });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await profile.mutateAsync(values);
    } catch (err) {
      form.setError("root", { message: errorMessage(err) });
    }
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Name" autoComplete="name" error={form.formState.errors.name?.message} {...form.register("name")} />
      <Field label="Email" name="email" value={email} readOnly disabled hint="Email changes aren't available yet." />
      {form.formState.errors.root?.message && <Notice>{form.formState.errors.root.message}</Notice>}
      {profile.isSuccess && !form.formState.isDirty && <Notice tone="ok">Saved.</Notice>}
      <Button type="submit" variant="secondary" loading={form.formState.isSubmitting} className="self-start">
        Save profile
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { password } = useAccount();
  const form = useForm({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await password.mutateAsync(values);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fields.currentPassword) form.setError("currentPassword", { message: err.fields.currentPassword });
      else form.setError("root", { message: errorMessage(err) });
    }
  });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register("currentPassword")} />
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Other devices get signed out."
        error={errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      {errors.root?.message && <Notice>{errors.root.message}</Notice>}
      {password.isSuccess && <Notice tone="ok">Password changed. Other devices were signed out.</Notice>}
      <Button type="submit" variant="secondary" loading={form.formState.isSubmitting} className="self-start">
        Change password
      </Button>
    </form>
  );
}

export function Account() {
  const me = useMe().data;
  const credits = useCredits();
  const { logout } = useSession();
  const navigate = useNavigate();
  if (!me) return null;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24">
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-hair py-12">
        <SplitHeadline parts={[{ text: "Your", strong: true }, { text: "account." }]} className="text-[clamp(36px,5.5vw,64px)]" />
        <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/", { replace: true }) })}>
          Sign out
        </Button>
      </section>

      <section className="border-b border-hair py-16">
        <Reveal className="flex flex-wrap gap-x-1 gap-y-6">
          <SectionLabel className="flex-[1_1_400px] self-start">Credits</SectionLabel>
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-8">
            <div>
              <p className="font-display text-[clamp(48px,6vw,80px)] font-semibold leading-none tracking-[-3px]">{credits.data?.balance ?? me.credits}</p>
              <p className="mt-2 text-[15px] text-muted">Video credits left. Each 6s clip uses one; clips that fail are refunded.</p>
            </div>
            {credits.data && (
              <div className="flex max-w-xl flex-col gap-5">
                <Meter label="Script drafts" meter={credits.data.usage.scripts} />
                <Meter label="Voice previews" meter={credits.data.usage.voices} />
              </div>
            )}
            <Notice tone="info">Paid plans are on the way. Need more credits now? Reply to any Castly email and we'll top you up.</Notice>
          </div>
        </Reveal>
      </section>

      <section className="border-b border-hair py-16">
        <Reveal className="flex flex-wrap gap-x-1 gap-y-6">
          <SectionLabel className="flex-[1_1_400px] self-start">History</SectionLabel>
          <div className="min-w-0 flex-[1_1_400px]">
            {credits.isLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-hair" />
            ) : credits.error ? (
              <Notice>{errorMessage(credits.error)}</Notice>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-[15px]">
                  <thead>
                    <tr className="border-b border-line font-mono text-xs text-muted">
                      <th className="py-3 pr-4 font-normal">When</th>
                      <th className="py-3 pr-4 font-normal">What</th>
                      <th className="py-3 pr-4 font-normal">Ad</th>
                      <th className="py-3 text-right font-normal">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.data?.entries.map((entry) => (
                      <tr key={entry.id} className="border-b border-hair">
                        <td className="py-3 pr-4 text-muted">{dateTime(entry.createdAt)}</td>
                        <td className="py-3 pr-4">{REASON_LABEL[entry.reason]}</td>
                        <td className="max-w-[220px] truncate py-3 pr-4 text-muted">{entry.note ?? "—"}</td>
                        <td className={cn("py-3 text-right font-mono", entry.delta > 0 ? "text-ok" : "text-ink")}>
                          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <section className="border-b border-hair py-16">
        <Reveal className="flex flex-wrap gap-x-1 gap-y-6">
          <SectionLabel className="flex-[1_1_400px] self-start">Profile</SectionLabel>
          <div className="min-w-0 max-w-[520px] flex-[1_1_400px]">
            <ProfileForm name={me.name} email={me.email} />
          </div>
        </Reveal>
      </section>

      <section className="py-16">
        <Reveal className="flex flex-wrap gap-x-1 gap-y-6">
          <SectionLabel className="flex-[1_1_400px] self-start">Password</SectionLabel>
          <div className="min-w-0 max-w-[520px] flex-[1_1_400px]">
            <PasswordForm />
          </div>
        </Reveal>
      </section>
    </main>
  );
}
