import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/castly/button";
import { BenchSkeleton } from "@/components/castly/studio-shell";
import { writeScript } from "@/lib/castly/ai";
import { CREATORS, LANGUAGES, STRUCTURES, makeProject } from "@/lib/castly/catalog";
import { useCastly } from "@/lib/castly/store";

export const Route = createFileRoute("/studio/agent")({
  head: () => ({ meta: [{ title: "Ad agent · Castly" }] }),
  component: AgentPage,
});

function AgentPage() {
  const hydrated = useCastly((state) => state.hydrated);
  const create = useCastly((state) => state.create);
  const navigate = useNavigate();
  const [product, setProduct] = useState("");
  const [pitch, setPitch] = useState("");
  const [audience, setAudience] = useState("");
  const [notes, setNotes] = useState("");
  const [structure, setStructure] = useState<string>(STRUCTURES[0].id);
  const [language, setLanguage] = useState("en");
  const [creatorId, setCreatorId] = useState(CREATORS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <BenchSkeleton />;

  const chosen = STRUCTURES.find((item) => item.id === structure) ?? STRUCTURES[0];

  const build = async () => {
    setError(null);
    setBusy(true);
    const result = await writeScript({
      data: {
        product,
        pitch,
        audience,
        angle: structure,
        language,
        brief: `${chosen.brief} Reference notes: ${notes || "none"}`,
        mode: "full",
        take: 1,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const id = create(
      makeProject({
        title: product || "Agent cut",
        product,
        pitch,
        audience,
        angle: structure,
        language,
        creatorId,
        script: {
          hook: result.hook,
          body: result.body,
          cta: result.cta,
          altHooks: result.altHooks,
        },
      }),
    );
    void navigate({ to: "/studio/p/$id", params: { id } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <p className="text-xs font-medium uppercase tracking-widest text-faint">Ad agent</p>
      <h1 className="mt-1 text-4xl">Describe the ad you wish you had.</h1>
      <p className="mt-3 text-muted">
        Tell it the shape — a call-out, a confession, a short rant, a get-ready. It writes the cut. You still press Hear it.
      </p>

      <div className="mt-8 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {STRUCTURES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStructure(item.id)}
              className={
                item.id === structure
                  ? "min-h-11 rounded-lg border border-primary bg-surface-2 px-3 py-3 text-left"
                  : "min-h-11 rounded-lg border border-border px-3 py-3 text-left"
              }
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-1 block text-xs text-muted">{item.brief}</span>
            </button>
          ))}
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Product</span>
          <input className="field" value={product} onChange={(event) => setProduct(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">What it does</span>
          <textarea className="field" value={pitch} onChange={(event) => setPitch(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Who it's for</span>
          <input className="field" value={audience} onChange={(event) => setAudience(event.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">What the reference ad does</span>
          <textarea
            className="field"
            placeholder="Opens on a bad morning, shows the product once, ends on a soft ask."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Language</span>
            <select className="field" value={language} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Creator</span>
            <select className="field" value={creatorId} onChange={(event) => setCreatorId(event.target.value)}>
              {CREATORS.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <Button disabled={busy || !product.trim()} onClick={() => void build()}>
          {busy ? "Writing the cut…" : "Write the cut"}
        </Button>
      </div>
    </div>
  );
}
