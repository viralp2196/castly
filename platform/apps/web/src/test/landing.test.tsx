import { CREATORS } from "@castly/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Landing } from "../pages/Landing";

function renderLanding(user: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200, headers: { "Content-Type": "application/json" } })),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Landing (creator-first)", () => {
  it("leads with the headline and sends visitors to sign up or sign in", async () => {
    renderLanding(null);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Pick a face\.\s*Hear your ad\./);
    const startFree = await screen.findAllByRole("link", { name: /Start free/ });
    expect(startFree[0]).toHaveAttribute("href", "/register");
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/login");
  });

  it("shows every creator from the catalog", () => {
    renderLanding(null);
    for (const creator of CREATORS) {
      expect(screen.getByText(creator.name)).toBeInTheDocument();
    }
  });

  it("points signed-in visitors at the app instead", async () => {
    renderLanding({ id: "u1", email: "a@b.co", name: "Ana", credits: 3, createdAt: "2026-10-04T00:00:00.000Z" });
    const open = await screen.findAllByRole("link", { name: /Open the bench/ });
    expect(open[0]).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
