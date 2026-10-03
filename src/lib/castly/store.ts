import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { makeProject, sampleProject } from "./catalog";
import type { AdProject } from "./types";

type BenchState = {
  hydrated: boolean;
  seeded: boolean;
  projects: AdProject[];
  create: (over?: Partial<AdProject>) => string;
  patch: (id: string, partial: Partial<AdProject>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
};

const memoryStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* full storage should not take the bench down */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useCastly = create<BenchState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seeded: false,
      projects: [],
      create: (over) => {
        const project = makeProject(over);
        set((state) => ({ projects: [project, ...state.projects] }));
        return project.id;
      },
      patch: (id, partial) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...partial, updatedAt: Date.now() } : project,
          ),
        })),
      remove: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
        })),
      duplicate: (id) => {
        const found = get().projects.find((project) => project.id === id);
        if (!found) return null;
        const copy = makeProject({
          ...found,
          id: undefined,
          title: `${found.title} copy`,
          createdAt: undefined,
          script: {
            ...found.script,
            altHooks: [...found.script.altHooks],
          },
        });
        set((state) => ({ projects: [copy, ...state.projects] }));
        return copy.id;
      },
    }),
    {
      name: "castly-bench-v1",
      skipHydration: true,
      storage: createJSONStorage(() => memoryStorage),
      partialize: (state) => ({ seeded: state.seeded, projects: state.projects }),
    },
  ),
);

let hydrateStarted = false;

export function hydrateBench() {
  if (hydrateStarted) return;
  hydrateStarted = true;
  const finish = () => {
    const state = useCastly.getState();
    if (!state.seeded && state.projects.length === 0) {
      useCastly.setState({ projects: [sampleProject()], seeded: true, hydrated: true });
    } else {
      useCastly.setState({ hydrated: true, seeded: true });
    }
  };
  useCastly.persist.onFinishHydration(finish);
  void useCastly.persist.rehydrate();
}
