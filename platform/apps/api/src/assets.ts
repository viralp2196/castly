import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getCreator } from "@castly/shared";

// Resolves to apps/api/assets from both src/ (dev) and dist/ (build).
const ASSETS = fileURLToPath(new URL("../assets/", import.meta.url));

const cache = new Map<string, string>();

/** The creator still sent to the video model as the opening frame. */
export async function creatorPortraitDataUrl(creatorId: string) {
  const creator = getCreator(creatorId);
  const hit = cache.get(creator.id);
  if (hit) return hit;
  const bytes = await readFile(`${ASSETS}creators/${creator.id}.jpg`);
  const url = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  cache.set(creator.id, url);
  return url;
}

export function toDataUrl(bytes: Buffer, contentType: string) {
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}
