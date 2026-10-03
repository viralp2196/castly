import type { ApiErrorBody } from "@castly/shared";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Absolute URL for an API path (media URLs come back as /api/... paths). */
export function apiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${BASE}${path}`;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
};

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.json !== undefined || options.form !== undefined;
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      credentials: "include",
      headers: options.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "network", "Can't reach Castly. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as (ApiErrorBody & T) | null;
  if (!res.ok) {
    const error = body?.error;
    throw new ApiError(res.status, error?.code ?? "error", error?.message ?? `Request failed (${res.status}).`, error?.fields ?? {});
  }
  return body as T;
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}
