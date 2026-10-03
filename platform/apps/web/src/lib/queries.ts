import type {
  CreditsOverview,
  ProfileInput,
  Project,
  ProjectPatch,
  ProjectSummary,
  User,
  Video,
} from "@castly/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const qk = {
  me: ["me"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  videos: ["videos"] as const,
  video: (id: string) => ["video", id] as const,
  credits: ["credits"] as const,
};

/** Refreshes everything that shows the credit balance or usage. */
export function refreshCredits(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.me });
  void qc.invalidateQueries({ queryKey: qk.credits });
}

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async () => (await api<{ user: User | null }>("/api/auth/me")).user,
    staleTime: 30_000,
  });
}

export function useSession() {
  const qc = useQueryClient();
  const onUser = (user: User) => {
    qc.clear();
    qc.setQueryData(qk.me, user);
  };
  return {
    register: useMutation({
      mutationFn: (input: { name: string; email: string; password: string }) =>
        api<{ user: User }>("/api/auth/register", { json: input }),
      onSuccess: ({ user }) => onUser(user),
    }),
    login: useMutation({
      mutationFn: (input: { email: string; password: string }) => api<{ user: User }>("/api/auth/login", { json: input }),
      onSuccess: ({ user }) => onUser(user),
    }),
    reset: useMutation({
      mutationFn: (input: { token: string; password: string }) => api<{ user: User }>("/api/auth/reset", { json: input }),
      onSuccess: ({ user }) => onUser(user),
    }),
    forgot: useMutation({
      mutationFn: (input: { email: string }) => api<void>("/api/auth/forgot", { json: input }),
    }),
    logout: useMutation({
      mutationFn: () => api<void>("/api/auth/logout", { method: "POST" }),
      onSettled: () => {
        qc.clear();
        qc.setQueryData(qk.me, null);
      },
    }),
  };
}

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async () => (await api<{ projects: ProjectSummary[] }>("/api/projects")).projects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: qk.project(id),
    queryFn: async () => (await api<{ project: Project }>(`/api/projects/${id}`)).project,
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId?: string) =>
      api<{ project: Project }>("/api/projects", { json: templateId ? { templateId } : {} }),
    onSuccess: ({ project }) => {
      qc.setQueryData(qk.project(project.id), project);
      void qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.project(id) });
      void qc.invalidateQueries({ queryKey: qk.projects });
      void qc.invalidateQueries({ queryKey: qk.videos });
    },
  });
}

export function patchProject(id: string, patch: ProjectPatch) {
  return api<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", json: patch });
}

export function useVideos() {
  return useQuery({
    queryKey: qk.videos,
    queryFn: async () => (await api<{ videos: Video[] }>("/api/videos")).videos,
    refetchInterval: (query) => (query.state.data?.some((v) => v.status === "pending") ? 5000 : false),
  });
}

export function useVideo(id: string | null) {
  return useQuery({
    queryKey: qk.video(id ?? "none"),
    queryFn: async () => (await api<{ video: Video }>(`/api/videos/${id}`)).video,
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 4000 : false),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/videos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.videos });
      void qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useCredits() {
  return useQuery({
    queryKey: qk.credits,
    queryFn: () => api<CreditsOverview>("/api/credits"),
  });
}

export function useAccount() {
  const qc = useQueryClient();
  return {
    profile: useMutation({
      mutationFn: (input: ProfileInput) => api<{ user: User }>("/api/account", { method: "PATCH", json: input }),
      onSuccess: ({ user }) => qc.setQueryData(qk.me, user),
    }),
    password: useMutation({
      mutationFn: (input: { currentPassword: string; newPassword: string }) =>
        api<void>("/api/account/password", { json: input }),
    }),
  };
}
