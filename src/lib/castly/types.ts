export type Script = {
  hook: string;
  body: string;
  cta: string;
  altHooks: string[];
};

export type FormatId = "talking" | "in-hand" | "hook-broll";
export type AspectId = "story" | "square" | "wide";
export type CaptionStyle = "punch" | "clean" | "lower";

export type AdProject = {
  id: string;
  title: string;
  product: string;
  pitch: string;
  audience: string;
  offer: string;
  angle: string;
  language: string;
  creatorId: string;
  sceneId: string;
  format: FormatId;
  aspect: AspectId;
  captionStyle: CaptionStyle;
  speed: number;
  script: Script;
  productImage?: string;
  createdAt: number;
  updatedAt: number;
};

export type WordCue = {
  word: string;
  start: number;
  end: number;
};
