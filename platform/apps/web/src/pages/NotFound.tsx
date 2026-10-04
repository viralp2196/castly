import { isRouteErrorResponse, useRouteError } from "react-router";
import { SplitHeadline } from "../components/SplitHeadline";
import { ButtonLink } from "../components/ui";

export function NotFound() {
  return (
    <main className="theme-night mx-auto flex min-h-[70vh] max-w-[1440px] flex-col justify-end gap-8 px-4 py-16">
      <SplitHeadline parts={[{ text: "Nothing", strong: true }, { text: "on this page." }]} className="text-[clamp(36px,5.5vw,64px)]" />
      <div>
        <ButtonLink to="/" arrow>
          Back to Castly
        </ButtonLink>
      </div>
    </main>
  );
}

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error";
  return (
    <main className="theme-night mx-auto flex min-h-[70vh] max-w-[1440px] flex-col justify-end gap-6 px-4 py-16">
      <SplitHeadline parts={[{ text: "Something", strong: true }, { text: "broke on our side." }]} className="text-[clamp(36px,5.5vw,64px)]" />
      <p className="max-w-xl font-mono text-sm text-muted">{message}</p>
      <div>
        <ButtonLink to="/" arrow>
          Back to Castly
        </ButtonLink>
      </div>
    </main>
  );
}
