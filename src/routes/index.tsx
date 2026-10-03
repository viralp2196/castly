import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CREATORS, FORMATS, TEMPLATES, SAMPLE_ID } from "@/lib/castly/catalog";

export const Route = createFileRoute("/")({
  component: Home,
});

const HERO_LINES = [
  "I stopped buying thick creams.",
  "Two pumps. No film.",
  "Day nine, the patch eased up.",
];

function Home() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="shrink-0 font-display text-2xl">
            Castly
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link to="/studio/library" className="inline-flex min-h-11 items-center px-2 text-muted sm:px-3">
              Library
            </Link>
            <Link to="/studio/agent" className="hidden min-h-11 items-center px-3 text-muted sm:inline-flex">
              Ad agent
            </Link>
            <Link
              to="/studio"
              className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-ink sm:px-4"
            >
              <span className="sm:hidden">Open</span>
              <span className="hidden sm:inline">Open the bench</span>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-20">
          <div>
            <p className="text-sm font-medium text-brass">A bench for UGC-style ads</p>
            <h1 className="mt-3 text-5xl leading-none lg:text-6xl">
              Ads that sound like a person, not a brand deck.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Write the line, cast a face, and hear the cut with captions locked to a real voice.
              Drafts stay in this browser. No creator calendar. No fake checkout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/studio"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-ink"
              >
                Open the bench
              </Link>
              <Link
                to="/studio/p/$id"
                params={{ id: SAMPLE_ID }}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm"
              >
                Hear the sample cut
              </Link>
            </div>
          </div>
          <HeroPhone />
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
            {[
              ["01", "Name the product", "One honest sentence about what it does. Upload a photo if it should sit in frame."],
              ["02", "Cast and write", "Eight creators, six angles, eight languages. Write it yourself or ask for a draft."],
              ["03", "Hear the cut", "A voice speaks the script. Captions hit the words as they're said."],
            ].map(([n, title, body]) => (
              <div key={n}>
                <p className="text-xs font-medium uppercase tracking-widest text-faint">{n}</p>
                <h2 className="mt-2 text-2xl">{title}</h2>
                <p className="mt-2 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-faint">The cast</p>
              <h2 className="mt-2 text-3xl">Faces you can put on a brief today.</h2>
            </div>
            <Link to="/studio" className="hidden text-sm text-brass sm:inline">
              Cast one
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CREATORS.map((creator) => (
              <figure key={creator.id} className="overflow-hidden rounded-lg border border-border">
                <img src={creator.portrait} alt={creator.name} className="frame-portrait w-full object-cover" />
                <figcaption className="px-2 py-2">
                  <span className="block text-sm font-medium">{creator.name}</span>
                  <span className="block text-xs text-muted">{creator.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 lg:grid-cols-3">
            {FORMATS.map((format) => (
              <article key={format.id} className="rounded-lg border border-border bg-bg p-5">
                <h2 className="text-2xl">{format.label}</h2>
                <p className="mt-2 text-sm text-muted">{format.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-medium uppercase tracking-widest text-faint">Library</p>
          <h2 className="mt-2 text-3xl">Shapes that already sound like ads.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {TEMPLATES.slice(0, 3).map((template) => {
              const creator = CREATORS.find((item) => item.id === template.creatorId);
              return (
                <article key={template.id} className="overflow-hidden rounded-lg border border-border">
                  {creator ? (
                    <img src={creator.portrait} alt="" className="h-44 w-full object-cover object-top" />
                  ) : null}
                  <div className="space-y-2 p-4">
                    <p className="text-xs uppercase tracking-widest text-faint">{template.niche}</p>
                    <h3 className="text-xl">{template.title}</h3>
                    <p className="text-sm text-muted">“{template.script.hook}”</p>
                  </div>
                </article>
              );
            })}
          </div>
          <Link
            to="/studio/library"
            className="mt-6 inline-flex min-h-11 items-center text-sm text-brass"
          >
            Browse the library
          </Link>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <h2 className="text-3xl">Before you ask.</h2>
            <div className="mt-6 divide-y divide-border">
              {[
                [
                  "Does the mouth match the words?",
                  "Hear this cut does not lip-sync. It plays a real voice over a living still, with captions on the words. Generate a 6s clip when you want a new take of that person saying the hook. That clip is a short generated video, not a finished export, and the link can expire.",
                ],
                [
                  "Where do the drafts live?",
                  "In this browser. There's no account. Clearing the site data clears the bench. The sample cut comes back if the bench is empty.",
                ],
                [
                  "What does Hear this cut spend?",
                  "One voice generation for that script, creator, and pace. The same line plays again from memory. Writing a script is a separate, smaller call. Nothing runs until you press the button.",
                ],
                [
                  "Can I use my product?",
                  "Yes. Add a photo and choose Product in frame. On the spoken preview it sits in the corner. On a generated clip it is sent as a reference so the pack can show up in the hand.",
                ],
              ].map(([q, a]) => (
                <details key={q} className="group py-4">
                  <summary className="cursor-pointer text-base font-medium">{q}</summary>
                  <p className="mt-2 text-sm text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span className="font-display text-xl text-fg">Castly</span>
          <span>Spoken UGC, without booking the creator.</span>
        </div>
      </footer>
    </div>
  );
}

function HeroPhone() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((current) => (current + 1) % HERO_LINES.length), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="rounded-xl bg-surface-3 p-1.5">
        <div className="frame-story relative overflow-hidden rounded-lg bg-surface">
          <video
            src="/creators/maya.mp4"
            poster="/creators/maya.jpg"
            muted
            loop
            playsInline
            autoPlay
            className="h-full w-full object-cover"
          />
          <div className="scrim pointer-events-none absolute inset-0" />
          <p className="absolute left-3 top-3 rounded-md bg-bg/70 px-2 py-1 text-xs">Maya Chen</p>
          <img
            src="/samples/serum.jpg"
            alt="Morning Dew Serum bottle"
            className="absolute right-3 top-3 h-16 w-16 rounded-md border border-border object-cover"
          />
          <p className="caption-punch absolute inset-x-0 bottom-0 p-4 text-center text-2xl font-semibold">
            {HERO_LINES[index]}
          </p>
        </div>
      </div>
    </div>
  );
}
