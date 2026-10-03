import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import type { Logger } from "pino";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "bad_request", message, fields);
export const unauthorized = (message = "Sign in to continue.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "That request isn't allowed.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new HttpError(409, "conflict", message, fields);
export const outOfCredits = () =>
  new HttpError(402, "out_of_credits", "You're out of video credits. Each new clip needs one credit.");
export const tooMany = (message: string) => new HttpError(429, "rate_limited", message);
export const unavailable = (message: string) => new HttpError(503, "unavailable", message);
export const upstream = (message: string) => new HttpError(502, "upstream_error", message);

function fieldsFrom(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Parses untrusted input, turning schema failures into a 400 with per-field messages. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const fields = fieldsFrom(result.error);
    const first = Object.values(fields)[0] ?? "Check the highlighted fields.";
    throw badRequest(first, fields);
  }
  return result.data;
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (res.headersSent) return;
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: "bad_request", message: "Check the highlighted fields.", fields: fieldsFrom(err) } });
      return;
    }
    if (err instanceof MulterError) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      res.status(tooBig ? 413 : 400).json({
        error: { code: tooBig ? "too_large" : "bad_upload", message: tooBig ? "Use a photo under 5 MB." : "Couldn't read that upload." },
      });
      return;
    }
    const type = (err as { type?: string }).type;
    if (type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "bad_json", message: "The request body isn't valid JSON." } });
      return;
    }
    if (type === "entity.too.large") {
      res.status(413).json({ error: { code: "too_large", message: "That request is too large." } });
      return;
    }
    logger.error({ err, path: req.path }, "unhandled error");
    res.status(500).json({ error: { code: "internal", message: "Something went wrong on our side. Try again." } });
  };
}
