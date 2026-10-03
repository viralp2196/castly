import { useEffect, useRef, useState } from "react";
import { pollCutVideo, startCutVideo } from "./ai";
import { urlToJpeg } from "./image";
import type { AdProject } from "./types";

export function cutKey(project: AdProject) {
  const photo = project.productImage ?? "";
  return [
    project.creatorId,
    project.sceneId,
    project.format,
    project.aspect,
    project.script.hook.trim(),
    project.product.trim(),
    photo.length,
    photo.slice(-32),
  ].join("|");
}

export function useCutVideo(onReady: (url: string, key: string) => void) {
  const [phase, setPhase] = useState<"idle" | "starting" | "rendering" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const generate = async (project: AdProject) => {
    const hook = project.script.hook.trim();
    if (hook.length < 8) {
      setPhase("error");
      setError("Write a hook before you generate a clip.");
      return;
    }
    stop();
    setError(null);
    setPhase("starting");
    const key = cutKey(project);
    let portrait = "";
    try {
      const creatorSrc = `/creators/${project.creatorId}.jpg`;
      portrait = await urlToJpeg(creatorSrc);
    } catch (caught) {
      setPhase("error");
      setError(caught instanceof Error ? caught.message : "Couldn't read the creator photo.");
      return;
    }
    const started = await startCutVideo({
      data: {
        creatorId: project.creatorId,
        sceneId: project.sceneId,
        format: project.format,
        aspect: project.aspect,
        hook,
        product: project.product,
        portrait,
        productImage: project.productImage,
      },
    });
    if (!started.ok) {
      setPhase("error");
      setError(started.error);
      return;
    }
    setPhase("rendering");
    let tries = 0;
    timer.current = window.setInterval(() => {
      tries += 1;
      void pollCutVideo({ data: { requestId: started.requestId } }).then((result) => {
        if (!result.ok) {
          stop();
          setPhase("error");
          setError(result.error);
          return;
        }
        if (result.status === "done" && result.url) {
          stop();
          onReadyRef.current(result.url, key);
          setPhase("idle");
          return;
        }
        if (result.status === "failed" || result.status === "expired") {
          stop();
          setPhase("error");
          setError(result.error || "The clip didn't finish.");
          return;
        }
        if (tries > 45) {
          stop();
          setPhase("error");
          setError("The clip is taking too long. Try once more in a minute.");
        }
      });
    }, 4000);
  };

  return { phase, error, generate };
}
