import type { ProjectSummary } from "@castly/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "../pages/app/Dashboard";

const user = { id: "u1", email: "ana@example.com", name: "Ana", credits: 2, createdAt: "2026-10-04T00:00:00.000Z" };

const draft: ProjectSummary = {
  id: "p_draft",
  title: "Morning Dew Serum",
  product: "Morning Dew Serum",
  creatorId: "maya",
  aspect: "story",
  updatedAt: "2026-10-05T09:00:00.000Z",
  latestVideo: null,
  hook: "I stopped buying thick creams.",
};

const withClip: ProjectSummary = {
  ...draft,
  id: "p_clip",
  title: "Heavyweight pocket tee",
  creatorId: "jordan",
  latestVideo: {
    id: "v1",
    projectId: "p_clip",
    projectTitle: "Heavyweight pocket tee",
    status: "ready",
    hook: "Most pocket tees feel like a receipt.",
    aspect: "story",
    creatorId: "jordan",
    url: "/api/media/videos/v1",
    error: null,
    createdAt: "2026-10-05T09:00:00.000Z",
    completedAt: "2026-10-05T09:01:00.000Z",
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function renderDashboard(options: { deleteStatus?: number } = {}) {
  let projects = [draft, withClip];
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/api/auth/me")) return json({ user });
    if (url.endsWith("/api/projects") && (init?.method ?? "GET") === "GET") return json({ projects });
    if (init?.method === "DELETE") {
      if (options.deleteStatus) return json({ error: { code: "upstream_error", message: "Couldn't delete that draft." } }, options.deleteStatus);
      projects = projects.filter((p) => !url.endsWith(p.id));
      return new Response(null, { status: 204 });
    }
    return json({ error: { code: "not_found", message: "Not found" } }, 404);
  });
  vi.stubGlobal("fetch", fetch);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { fetch };
}

// Template buttons reuse these titles, so find projects by their card link.
const card = (title: string) => screen.queryByRole("link", { name: new RegExp(title) });

afterEach(() => vi.unstubAllGlobals());

describe("Dashboard — delete a draft", () => {
  it("offers delete on drafts only", async () => {
    renderDashboard();
    expect(await screen.findByRole("button", { name: "Delete draft Morning Dew Serum" })).toBeInTheDocument();
    expect(card("Heavyweight pocket tee")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete draft Heavyweight/ })).toBeNull();
  });

  it("confirms on the card and puts focus back when kept", async () => {
    const { fetch } = renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft Morning Dew Serum" }));

    const panel = screen.getByRole("group", { name: "Delete “Morning Dew Serum”?" });
    const keep = within(panel).getByRole("button", { name: "Keep it" });
    expect(keep).toHaveFocus();

    fireEvent.click(keep);
    expect(screen.queryByRole("group", { name: /Delete “Morning Dew Serum”/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Delete draft Morning Dew Serum" })).toHaveFocus();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining("/api/projects/p_draft"), expect.anything());
  });

  it("closes the confirm on Escape", async () => {
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft Morning Dew Serum" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Keep it" }), { key: "Escape" });
    expect(screen.queryByRole("group", { name: /Delete “Morning Dew Serum”/ })).toBeNull();
  });

  it("deletes the draft, drops the card and says so", async () => {
    const { fetch } = renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft Morning Dew Serum" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));

    expect(await screen.findByText("Deleted “Morning Dew Serum”.")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/projects/p_draft"), expect.objectContaining({ method: "DELETE" }));
    await waitFor(() => expect(card("Morning Dew Serum")).toBeNull());
    expect(card("Heavyweight pocket tee")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Deleted “Morning Dew Serum”.")).toBeNull();
  });

  it("keeps the card and shows the error when the delete fails", async () => {
    renderDashboard({ deleteStatus: 502 });
    fireEvent.click(await screen.findByRole("button", { name: "Delete draft Morning Dew Serum" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete that draft.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(card("Morning Dew Serum")).toBeInTheDocument();
  });
});
