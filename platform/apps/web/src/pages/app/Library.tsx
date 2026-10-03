import { getAspect, getCreator, type Video } from "@castly/shared";
import { useState } from "react";
import { Link } from "react-router";
import { SplitHeadline } from "../../components/SplitHeadline";
import { Mono, Notice, Progress } from "../../components/ui";
import { apiUrl, errorMessage } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { useDeleteVideo, useVideos } from "../../lib/queries";
import { StatusTag } from "./Dashboard";

function ClipCard({ video }: { video: Video }) {
  const creator = getCreator(video.creatorId);
  const remove = useDeleteVideo();
  const [confirming, setConfirming] = useState(false);
  const aspect = getAspect(video.aspect);

  return (
    <article className="min-w-0">
      <div className="relative mb-3 overflow-hidden rounded-lg bg-hair" style={{ aspectRatio: aspect.css }}>
        {video.status === "ready" && video.url ? (
          <video
            className="absolute inset-0 size-full bg-ink object-cover"
            src={apiUrl(video.url)}
            poster={creator.portrait}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <>
            <img src={creator.portrait} alt="" className={video.status === "failed" ? "absolute inset-0 size-full object-cover grayscale" : "absolute inset-0 size-full object-cover"} />
            <div className="absolute inset-x-3 bottom-3 flex flex-col gap-3 rounded-lg bg-white px-4 py-3">
              {video.status === "pending" ? (
                <>
                  <p className="text-[15px]">Rendering your 6s take…</p>
                  <Progress value={null} />
                </>
              ) : (
                <p className="text-[15px] text-danger">{video.error ?? "This clip didn't finish."}</p>
              )}
            </div>
          </>
        )}
        <span className="absolute left-3 top-3">
          <StatusTag video={video} />
        </span>
      </div>
      <p className="text-[17px] font-medium">{video.projectTitle ?? "Deleted ad"}</p>
      <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-muted">“{video.hook}”</p>
      <Mono className="mt-2 block">
        {creator.name} · {aspect.label} · {dateTime(video.createdAt)}
      </Mono>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
        {video.status === "ready" && video.url && (
          <a href={apiUrl(`${video.url}?download=1`)} className="uline">
            Download mp4
          </a>
        )}
        {video.projectId && (
          <Link to={`/app/projects/${video.projectId}?step=4`} className="uline">
            Open ad
          </Link>
        )}
        {video.status !== "pending" && (
          <button
            type="button"
            className="uline"
            disabled={remove.isPending}
            onClick={() => (confirming ? remove.mutate(video.id) : setConfirming(true))}
            onBlur={() => setConfirming(false)}
          >
            {confirming ? "Confirm delete" : "Delete"}
          </button>
        )}
      </div>
      {remove.error && (
        <div className="mt-3">
          <Notice>{errorMessage(remove.error)}</Notice>
        </div>
      )}
    </article>
  );
}

export function Library() {
  const videos = useVideos();
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-24">
      <section className="flex flex-wrap items-end justify-between gap-6 border-b border-hair py-12">
        <SplitHeadline parts={[{ text: "Your", strong: true }, { text: "clips." }]} className="text-[clamp(36px,5.5vw,64px)]" />
        <p className="fade-up max-w-md text-[15px] text-muted" style={{ animationDelay: ".3s" }}>
          Every generated take lives here. Clips that fail are refunded automatically.
        </p>
      </section>
      <section className="py-12">
        {videos.isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-[9/16] animate-pulse rounded-lg bg-hair" />
            ))}
          </div>
        ) : videos.error ? (
          <Notice>{errorMessage(videos.error)}</Notice>
        ) : videos.data && videos.data.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] items-start gap-x-2 gap-y-10">
            {videos.data.map((video) => (
              <ClipCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
            <p className="text-xl tracking-[-0.4px]">No clips yet.</p>
            <p className="mt-2 text-muted">
              Open an ad and use <span className="text-ink">Ship</span> to generate your first 6s take.
            </p>
            <Link to="/app" className="uline mt-4 inline-block">
              Go to projects
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
