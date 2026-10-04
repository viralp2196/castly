import { CREATORS, getCreator, type Creator } from "@castly/shared";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { Reveal } from "../components/Reveal";
import { useMe } from "../lib/queries";

/** Three columns of creator portraits drifting up and down behind the hero card. */
const COLUMNS: { ids: string[]; className: string }[] = [
  { ids: ["maya", "aisha", "noah"], className: "col-a" },
  { ids: ["jordan", "priya", "kenji"], className: "col-b" },
  { ids: ["sofia", "leo", "jordan"], className: "col-c" },
];

const STEPS = [
  { n: "01", title: "Write", body: "The writer drafts the hook; you keep the one that sounds like you." },
  { n: "02", title: "Cast", body: `Choose the face and voice from ${CREATORS.length} creators.` },
  { n: "03", title: "Hear", body: "A real voice with captions locked to every word." },
  { n: "04", title: "Ship", body: "A 6s clip for one credit; failed takes are refunded." },
];

const BARS = Array.from({ length: 30 }, (_, i) => ({
  height: Math.round(6 + ((Math.sin(i * 1.7) + Math.sin(i * 0.63 + 1)) * 0.25 + 0.5) * 20),
  delay: `${((i % 9) * 0.08).toFixed(2)}s`,
}));

function Accent({ children }: { children: ReactNode }) {
  return <em className="font-serif font-normal italic tracking-[-0.01em] text-iris-soft">{children}</em>;
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function voiceName(creator: Creator) {
  return `${creator.voiceId.charAt(0).toUpperCase()}${creator.voiceId.slice(1)} voice`;
}

function HeroColumns() {
  const priya = getCreator("priya");
  return (
    <div
      className="cols cols-mask blur-in relative h-[520px] min-w-0 flex-[1_1_520px] overflow-hidden rounded-[36px] md:h-[720px]"
      style={{ animationDelay: ".3s" }}
      aria-hidden="true"
    >
      <div className="flex h-full gap-3">
        {COLUMNS.map((column) => (
          <div key={column.className} className="min-w-0 flex-1 overflow-hidden">
            {/* The list is doubled and each tile carries its own bottom padding, so -50% loops seamlessly. */}
            <div className={`${column.className} flex flex-col`}>
              {[...column.ids, ...column.ids].map((id, i) => (
                <div key={`${id}-${i}`} className="pb-3">
                  <img src={getCreator(id).portrait} alt="" className="block aspect-[3/4] w-full rounded-[22px] object-cover" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-16 flex justify-center px-5">
        <div className="glass-dark bob w-full max-w-[340px] rounded-3xl px-4 pb-4 pt-3.5 text-white">
          <div className="flex justify-between font-mono text-[11px] tracking-[0.06em] text-fog">
            <span>VOICE · {priya.name.split(" ")[0]!.toUpperCase()}</span>
            <span>{priya.voiceId.toUpperCase()}</span>
          </div>
          <div className="mt-2.5 flex h-[26px] items-center justify-between gap-[3px]">
            {BARS.map((bar, i) => (
              <span
                key={i}
                className="wave-bar is-live block max-w-1 flex-1 rounded-sm bg-iris-soft"
                style={{ height: bar.height, animationDelay: bar.delay }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <Link
      to="/register"
      className="lift tile-zoom group/tile block min-w-0"
      onMouseEnter={() => void video.current?.play().catch(() => undefined)}
      onMouseLeave={() => video.current?.pause()}
    >
      <span className="relative block aspect-[4/5] overflow-hidden rounded-3xl bg-night-3">
        <img src={creator.portrait} alt={`${creator.name}, ${creator.role}`} loading="lazy" className="tile-media absolute inset-0 size-full object-cover" />
        {creator.loop && (
          <video
            ref={video}
            src={creator.loop}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className="tile-media absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover/tile:opacity-100"
          />
        )}
      </span>
      <span className="mt-3 block text-[17px] font-semibold text-white">{creator.name}</span>
      <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.05em] text-dusk">
        {voiceName(creator)} · {creator.role}
      </span>
    </Link>
  );
}

export function Landing() {
  const me = useMe().data;
  const primary = me ? { to: "/app", label: "Open the bench" } : { to: "/register", label: "Start free" };

  return (
    <div className="min-h-screen overflow-hidden bg-night font-sans text-white">
      <header className="blur-in mx-auto flex max-w-[1376px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 md:px-8">
        <Link to="/" aria-label="Castly home" className="inline-flex items-center gap-1.5 font-display text-2xl font-bold tracking-[-0.03em]">
          castly<span className="size-2 rounded-full bg-iris" />
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] font-medium text-fog">
          <a href="#creators" className="transition-colors duration-300 hover:text-white">
            Creators
          </a>
          <a href="#how" className="transition-colors duration-300 hover:text-white">
            How it works
          </a>
          {!me && (
            <Link to="/login" className="transition-colors duration-300 hover:text-white">
              Sign in
            </Link>
          )}
          <Link to={primary.to} className="btn-spring rounded-full bg-iris px-5 py-2.5 font-semibold text-white">
            {primary.label}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto flex max-w-[1376px] flex-wrap items-center gap-14 px-4 pb-24 pt-6 md:px-8">
          <div className="min-w-0 flex-[1_1_480px]">
            <span className="blur-in inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 font-mono text-xs tracking-[0.08em] text-fog" style={{ animationDelay: ".1s" }}>
              <span className="size-[7px] rounded-full bg-iris-soft" />
              {CREATORS.length} CREATORS · {CREATORS.length} VOICES
            </span>
            <h1 className="mt-6 font-display text-[clamp(52px,7.4vw,116px)] font-semibold leading-[0.94] tracking-[-0.045em]">
              <span className="mask-line">
                <span style={{ animationDelay: ".2s" }}>
                  Pick a <Accent>face.</Accent>
                </span>
              </span>{" "}
              <span className="mask-line">
                <span style={{ animationDelay: ".34s" }}>
                  Hear your <Accent>ad.</Accent>
                </span>
              </span>
            </h1>
            <p className="blur-in mt-7 max-w-[500px] text-[clamp(17px,1.6vw,20px)] leading-[1.55] text-fog" style={{ animationDelay: ".6s" }}>
              Write one line and choose who says it. Castly reads it in a real voice with word-locked captions, then turns it into a 6-second clip of that creator.
            </p>
            <div className="blur-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: ".72s" }}>
              <Link to={primary.to} className="btn-spring inline-flex min-h-14 items-center gap-2.5 rounded-full bg-iris px-7 text-[17px] font-semibold">
                {primary.label}
                <ArrowRight />
              </Link>
              {!me && (
                <Link
                  to="/login"
                  className="inline-flex min-h-14 items-center rounded-full border-[1.5px] border-white/40 px-6 text-[17px] font-semibold transition-colors duration-300 hover:bg-white hover:text-night"
                >
                  Sign in
                </Link>
              )}
            </div>
            {!me && <p className="mt-4 font-mono text-xs tracking-[0.06em] text-dusk">FREE CLIPS ON SIGN-UP · NO CARD</p>}
          </div>
          <HeroColumns />
        </section>

        <section id="creators" className="mx-auto max-w-[1376px] px-4 pb-10 pt-20 md:px-8">
          <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <h2 className="font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[0.98] tracking-[-0.04em]">
              Who should <Accent>say it?</Accent>
            </h2>
            <p className="max-w-[380px] text-[17px] leading-[1.55] text-fog">
              Swap the creator and the same script comes back in a new face and voice. Hover a card to see them move.
            </p>
          </Reveal>
          <Reveal className="grid grid-cols-2 gap-x-3.5 gap-y-8 md:grid-cols-4">
            {CREATORS.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </Reveal>
        </section>

        <section id="how" className="mx-auto max-w-[1376px] px-4 pb-10 pt-20 md:px-8">
          <Reveal>
            <h2 className="mb-7 font-display text-[clamp(36px,4vw,56px)] font-semibold tracking-[-0.04em]">
              Four moves, <Accent>one</Accent> cut.
            </h2>
          </Reveal>
          <div className="flex flex-wrap gap-3.5">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.06} className="flex min-w-0 flex-[1_1_240px]">
                <div className="lift flex w-full flex-col gap-12 rounded-[26px] border border-white/10 bg-night-2 p-6 hover:border-iris-soft/60 hover:bg-night-3">
                  <span className="font-mono text-xs text-iris-soft">{step.n}</span>
                  <span>
                    <span className="block font-display text-[26px] font-semibold tracking-[-0.03em]">{step.title}</span>
                    <span className="mt-1.5 block text-base leading-normal text-fog">{step.body}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-4 pb-4 pt-20">
          <Reveal className="mx-auto flex max-w-[1408px] flex-wrap items-end justify-between gap-7 rounded-[40px] bg-iris px-6 py-10 md:px-[72px] md:py-[84px]">
            <h2 className="min-w-0 flex-[1_1_480px] font-display text-[clamp(44px,6vw,96px)] font-semibold leading-[0.94] tracking-[-0.045em]">
              Same line. <em className="font-serif font-normal italic">Any</em> face.
            </h2>
            <Link to={primary.to} className="btn-spring inline-flex min-h-[58px] items-center gap-2.5 rounded-full bg-white px-8 text-[17px] font-semibold text-night">
              {me ? "Open the bench" : "Create your account"}
              <ArrowRight />
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1376px] flex-wrap justify-between gap-3 px-4 pb-10 pt-6 text-[15px] text-dusk md:px-8">
        <span>castly — a bench for UGC-style ads</span>
        <span>Each 6s clip uses one credit. Failed clips are refunded.</span>
      </footer>
    </div>
  );
}
