import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SplitHeadline } from "../components/SplitHeadline";
import { Waveform } from "../components/Waveform";
import { api, ApiError } from "../lib/api";
import { clock, plural, timeAgo } from "../lib/format";

afterEach(() => vi.unstubAllGlobals());

describe("SplitHeadline", () => {
  it("reads as one sentence and animates every letter in order", () => {
    const { container } = render(<SplitHeadline parts={[{ text: "Hear", strong: true }, { text: "the cut" }]} />);
    expect(screen.getByRole("heading", { name: "Hear the cut" })).toBeInTheDocument();
    const letters = container.querySelectorAll<HTMLElement>(".letter");
    expect(letters).toHaveLength(10);
    expect(letters[0]).toHaveClass("text-ink");
    expect(letters[4]).toHaveClass("text-soft");
    expect(letters[1]!.style.animationDelay).toBe("0.172s");
  });
});

describe("Waveform", () => {
  it("fills bars up to the progress", () => {
    const { container } = render(<Waveform progress={0.5} live={false} bars={10} />);
    const bars = container.querySelectorAll<HTMLElement>(".wave-bar");
    expect(bars).toHaveLength(10);
    expect(bars[4]!.style.background).toContain("var(--color-ink)");
    expect(bars[5]!.style.background).not.toContain("var(--color-ink)");
  });
});

describe("api", () => {
  it("turns error bodies into ApiError with field messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { code: "bad_request", message: "Enter a valid email.", fields: { email: "Enter a valid email." } } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(api("/api/auth/login", { json: {} })).rejects.toMatchObject({
      status: 400,
      code: "bad_request",
      fields: { email: "Enter a valid email." },
    });
  });

  it("reports network failures in plain language", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const error = await api("/api/projects").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });

  it("sends cookies and JSON", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await api("/api/projects", { json: { templateId: "dew" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({ method: "POST", credentials: "include", body: '{"templateId":"dew"}' }),
    );
  });
});

describe("format", () => {
  it("formats clocks, plurals and relative times", () => {
    expect(clock(65.4)).toBe("1:05");
    expect(plural(1, "credit")).toBe("1 credit");
    expect(plural(3, "credit")).toBe("3 credits");
    const now = Date.parse("2026-10-03T12:00:00Z");
    expect(timeAgo("2026-10-03T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-03T11:15:00Z", now)).toBe("45 min ago");
  });
});
