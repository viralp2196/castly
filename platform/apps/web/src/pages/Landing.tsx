import { getCreator, type Creator } from "@castly/shared";
import { useRef } from "react";
import { Link } from "react-router";
import { SiteHeader } from "../components/Headers";
import { Reveal, useReducedMotion } from "../components/Reveal";
import { SplitHeadline } from "../components/SplitHeadline";
import { ButtonLink, Mono, PauseIcon, SectionLabel } from "../components/ui";
import { Waveform } from "../components/Waveform";
import { useMe } from "../lib/queries";

const CAPTION = ["Okay,", "this", "cold", "brew", "just", "ended", "my", "3pm", "slump."];
const HOOKS = [
  "Okay, this cold brew just ended my 3pm slump.",
  "POV: you stop paying café prices.",
  "I did not expect a can to taste this good.",
  "Same line, different creator.",
  "Most pocket tees feel like a receipt after the dryer.",
];
const STEPS = [
  { n: "001", title: "Write", sub: "Start with the hook.", body: "Type the product line, pick an angle, and let the writer draft the hook, body and call to action." },
  { n: "002", title: "Cast", sub: "Choose who says it.", body: "Pick the face and voice. Swap creators any time without touching the script." },
  { n: "003", title: "Hear", sub: "Listen before you ship.", body: "Press play for a real voice, with captions locked word by word to the audio." },
  { n: "004", title: "Ship", sub: "One take, one button.", body: "Pick a format and generate a 6s clip of that face saying the hook." },
];
const FEATURED = ["maya", "jordan", "aisha", "noah"].map(getCreator);

function ReadingCaption({ className }: { className?: string }) {
  return (
    <p className={className}>
      {CAPTION.map((word, i) => (
        <span key={i} className="read-word" style={{ animationDelay: `${(i * 0.42).toFixed(2)}s` }}>
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

function HeroTile() {
  const maya = getCreator("maya");
  const reduced = useReducedMotion();
  return (
    <div className="tile-zoom relative aspect-square overflow-hidden rounded-lg bg-peach">
      {maya.loop && !reduced ? (
        <video
          className="tile-media drift absolute inset-0 size-full object-cover"
          src={maya.loop}
          poster={maya.portrait}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      ) : (
        <img className="tile-media absolute inset-0 size-full object-cover" src={maya.portrait} alt="" />
      )}
      <span className="absolute left-4 top-4 rounded-md bg-white px-2.5 py-1.5 font-mono text-[13px]">Voice · Maya</span>
      <span className="absolute right-4 top-4 rounded-md bg-white px-2.5 py-1.5 font-mono text-[13px]">0:06</span>
      <div className="absolute inset-x-4 bottom-4 rounded-lg bg-white px-5 py-4">
        <ReadingCaption className="text-[clamp(18px,1.8vw,24px)] font-medium leading-snug tracking-[-0.5px]" />
      </div>
    </div>
  );
}

function BenchMock() {
  return (
    <section className="px-4 pb-16">
      <div className="fade-up mx-auto max-w-[1440px]" style={{ animationDelay: ".6s" }}>
        <div className="flex min-h-[420px] items-center justify-center rounded-lg bg-subtle p-6 md:aspect-[2/1]">
          <div className="flex w-full max-w-[820px] flex-col gap-7 rounded-lg border border-line bg-white p-7">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              {["Write", "Cast", "Hear", "Ship"].map((label, i) => (
                <span key={label} className={i === 2 ? "border-b border-ink pb-1 text-ink" : "text-muted"}>
                  <span className="font-mono text-xs">00{i + 1}</span> {label}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-5">
              <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-ink text-white">
                <PauseIcon />
              </span>
              <Waveform progress={0.65} live bars={40} height={56} />
              <span className="shrink-0 font-mono text-[13px] text-muted">0:04 / 0:06</span>
            </div>
            <ReadingCaption className="text-[clamp(22px,2.6vw,34px)] leading-tight tracking-[-1px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorTile({ creator }: { creator: Creator }) {
  const video = useRef<HTMLVideoElement>(null);
  return (
    <div
      className="tile-zoom group/tile min-w-0 flex-[1_1_260px]"
      onMouseEnter={() => void video.current?.play().catch(() => undefined)}
      onMouseLeave={() => video.current?.pause()}
    >
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-hair">
        <img className="tile-media absolute inset-0 size-full object-cover" src={creator.portrait} alt={`${creator.name}, ${creator.role}`} loading="lazy" />
        {creator.loop && (
          <video
            ref={video}
            className="tile-media absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-500 group-hover/tile:opacity-100"
            src={creator.loop}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-[17px] font-medium">{creator.name}</p>
      <p className="mt-0.5 text-sm text-muted">{creator.role}</p>
    </div>
  );
}

export function Landing() {
  const me = useMe().data;
  const cta = me ? { to: "/app", label: "Open the bench" } : { to: "/register", label: "Start free" };

  return (
    <div className="bg-white text-ink">
      <SiteHeader />
      <main>
        <section className="px-4 pb-2 pt-4">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-stretch gap-x-1 gap-y-6">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col justify-end gap-10 py-10 md:py-16">
              <SplitHeadline
                className="max-w-[600px] text-[clamp(36px,5.5vw,64px)]"
                parts={[
                  { text: "Castly", strong: true },
                  { text: "turns one" },
                  { text: "line", strong: true },
                  { text: "into a" },
                  { text: "UGC ad", strong: true },
                  { text: "you can" },
                  { text: "hear.", strong: true },
                ]}
              />
              <div className="fade-up" style={{ animationDelay: "1s" }}>
                <p className="max-w-[540px] text-[clamp(17px,1.6vw,20px)] leading-[1.625] text-muted">
                  Write the hook, cast a creator, and hear the cut with captions locked to a real voice. Nothing is generated until you press the button.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
                  <ButtonLink to={cta.to} arrow>
                    {cta.label}
                  </ButtonLink>
                  <a href="#how" className="uline text-[17px]">
                    See how it works
                  </a>
                </div>
                {!me && <Mono className="mt-4 block">Free credits on sign-up. No card needed.</Mono>}
              </div>
            </div>
            <div className="fade-up min-w-0 flex-[1_1_420px]" style={{ animationDelay: ".35s" }}>
              <HeroTile />
            </div>
          </div>
        </section>

        <BenchMock />

        <section className="border-t border-hair px-4 py-24">
          <Reveal className="mx-auto flex max-w-[1440px] flex-wrap gap-x-1 gap-y-4">
            <SectionLabel className="flex-[1_1_400px] self-start md:sticky md:top-4">About</SectionLabel>
            <div className="min-w-0 flex-[1_1_400px]">
              <p className="max-w-[620px] text-[clamp(17px,1.6vw,20px)] leading-[1.625] text-muted">
                Castly is a bench for UGC-style ads. Your drafts are saved to your account. Scripts and voices come from xAI, and a 6s clip of the cast face saying the hook is one button away.
              </p>
              <Link to={cta.to} className="uline mt-4 inline-block text-[clamp(17px,1.6vw,20px)]">
                {cta.label}
              </Link>
            </div>
          </Reveal>
        </section>

        <section id="how" className="border-t border-hair px-4 py-24">
          <div className="mx-auto max-w-[1440px]">
            <Reveal>
              <SectionLabel className="mb-8">How it works</SectionLabel>
            </Reveal>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((step, i) => (
                <Reveal key={step.n} delay={i * 0.08} className="flex min-w-0 flex-[1_1_260px]">
                  <Link
                    to={cta.to}
                    className="flex w-full flex-col justify-between gap-28 rounded-lg border border-line p-6 transition-colors duration-300 hover:border-ink"
                  >
                    <Mono className="text-sm">{step.n}</Mono>
                    <div>
                      <p className="text-[clamp(24px,2.2vw,28px)] font-medium tracking-[-0.6px]">{step.title}</p>
                      <p className="mb-4 mt-2 text-base font-medium">{step.sub}</p>
                      <p className="text-base leading-[1.625] text-muted">{step.body}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="creators" className="border-t border-hair px-4 py-24">
          <div className="mx-auto max-w-[1440px]">
            <Reveal className="mb-8 flex flex-wrap gap-x-1 gap-y-4">
              <SectionLabel className="flex-[1_1_400px]">Creators</SectionLabel>
              <div className="min-w-0 flex-[1_1_400px]">
                <p className="max-w-[560px] text-[17px] leading-[1.625] text-muted">
                  Same line, different face. Each creator brings their own voice and pace to the hook. Hover to see them move.
                </p>
                <Link to={cta.to} className="uline mt-4 inline-block text-[17px]">
                  Cast one now
                </Link>
              </div>
            </Reveal>
            <Reveal className="flex flex-wrap gap-2">
              {FEATURED.map((creator) => (
                <CreatorTile key={creator.id} creator={creator} />
              ))}
            </Reveal>
          </div>
        </section>

        <section aria-label="Sample hooks" className="overflow-hidden border-t border-hair py-24">
          <div className="marquee-mask overflow-hidden">
            <div className="marquee-track flex w-max items-center gap-5">
              {[...HOOKS, ...HOOKS].map((hook, i) => (
                <span key={i} className="shrink-0 whitespace-nowrap rounded-lg border border-line px-[22px] py-4 text-xl tracking-[-0.4px]" aria-hidden={i >= HOOKS.length || undefined}>
                  {hook}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-hair px-4 pb-12 pt-16">
        <Reveal className="mx-auto flex max-w-[1440px] flex-col gap-40 md:gap-52">
          <div>
            <h2 className="text-[clamp(36px,5.5vw,64px)] font-light leading-[1.1] tracking-[-2.5px]">
              Write a line,
              <br />
              hear the cut.
            </h2>
            <Link
              to={cta.to}
              className="inline-block text-[clamp(36px,5.5vw,64px)] font-light leading-[1.1] tracking-[-2.5px] text-[#858585] transition-colors duration-300 hover:text-ink"
            >
              {cta.label}
            </Link>
          </div>
          <div className="flex flex-wrap justify-between gap-3 text-[15px] text-muted">
            <span>Castly. — A bench for UGC-style ads</span>
            <span>Each 6s clip uses one credit. Failed clips are refunded.</span>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}
