import type { Project, ProjectPatch } from "@castly/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../../lib/api";
import { patchProject, qk } from "../../../lib/queries";

export type SaveState = "saved" | "saving" | "error";

/**
 * Local copy of a project that edits instantly and autosaves.
 * Patches are merged and sent 600ms after the last keystroke, one request at a time.
 */
export function useDraft(server: Project | undefined) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Project | undefined>(server);
  const [state, setState] = useState<SaveState>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<ProjectPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const idRef = useRef<string | undefined>(server?.id);

  useEffect(() => {
    if (server && (!draft || draft.id !== server.id)) {
      idRef.current = server.id;
      pending.current = {};
      setDraft(server);
    }
  }, [server, draft]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      const id = idRef.current;
      const patch = pending.current;
      if (!id || Object.keys(patch).length === 0) return;
      pending.current = {};
      try {
        const { project } = await patchProject(id, patch);
        qc.setQueryData(qk.project(id), project);
        void qc.invalidateQueries({ queryKey: qk.projects });
        if (Object.keys(pending.current).length === 0) {
          setState("saved");
          setError(null);
        }
      } catch (err) {
        pending.current = { ...patch, ...pending.current };
        setState("error");
        setError(errorMessage(err));
      }
    });
    return chain.current;
  }, [qc]);

  const update = useCallback(
    (patch: ProjectPatch) => {
      setDraft((current) => (current ? ({ ...current, ...patch } as Project) : current));
      pending.current = { ...pending.current, ...patch };
      setState("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 600);
    },
    [flush],
  );

  /** Adopts a project the server just changed (AI script, photo upload), keeping unsaved local edits on top. */
  const replace = useCallback(
    (project: Project) => {
      setDraft({ ...project, ...pending.current } as Project);
      qc.setQueryData(qk.project(project.id), project);
      void qc.invalidateQueries({ queryKey: qk.projects });
    },
    [qc],
  );

  // Save whatever is left when the studio closes.
  useEffect(() => () => void flush(), [flush]);

  return { draft, update, flush, replace, state, error };
}

export type Draft = ReturnType<typeof useDraft>;
