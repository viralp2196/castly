import type { AdProject, AspectId, CaptionStyle, FormatId, Script } from "./types";

export type Creator = {
  id: string;
  name: string;
  role: string;
  gender: "woman" | "man";
  voiceId: string;
  portrait: string;
  loop?: string;
};

export type Scene = {
  id: string;
  label: string;
  detail: string;
  image: string;
};

export const CREATORS: Creator[] = [
  {
    id: "maya",
    name: "Maya Chen",
    role: "Morning routines",
    gender: "woman",
    voiceId: "ara",
    portrait: "/creators/maya.jpg",
    loop: "/creators/maya.mp4",
  },
  {
    id: "jordan",
    name: "Jordan Hale",
    role: "Streetwear",
    gender: "man",
    voiceId: "rex",
    portrait: "/creators/jordan.jpg",
    loop: "/creators/jordan.mp4",
  },
  {
    id: "aisha",
    name: "Aisha Rahman",
    role: "Beauty, close-up",
    gender: "woman",
    voiceId: "eve",
    portrait: "/creators/aisha.jpg",
    loop: "/creators/aisha.mp4",
  },
  {
    id: "leo",
    name: "Leo Martins",
    role: "Skincare, playful",
    gender: "man",
    voiceId: "leo",
    portrait: "/creators/leo.jpg",
  },
  {
    id: "priya",
    name: "Priya Shah",
    role: "Kitchen and home",
    gender: "woman",
    voiceId: "liora",
    portrait: "/creators/priya.jpg",
  },
  {
    id: "noah",
    name: "Noah Blake",
    role: "Car confession",
    gender: "man",
    voiceId: "sal",
    portrait: "/creators/noah.jpg",
    loop: "/creators/noah.mp4",
  },
  {
    id: "sofia",
    name: "Sofia Reyes",
    role: "Habits and training",
    gender: "woman",
    voiceId: "luna",
    portrait: "/creators/sofia.jpg",
  },
  {
    id: "kenji",
    name: "Kenji Sato",
    role: "Apps and gadgets",
    gender: "man",
    voiceId: "orion",
    portrait: "/creators/kenji.jpg",
  },
];

export const SCENES: Scene[] = [
  { id: "kitchen", label: "Kitchen", detail: "Morning counter, soft window light", image: "/scenes/kitchen.jpg" },
  { id: "street", label: "Street", detail: "Walking-home golden hour", image: "/scenes/street.jpg" },
  { id: "car", label: "Car", detail: "The confession seat", image: "/scenes/car.jpg" },
  { id: "desk", label: "Desk", detail: "Laptop just out of focus", image: "/scenes/desk.jpg" },
];

export const ANGLES = [
  { id: "confession", label: "Confession", hint: "A specific day, one sensory detail" },
  { id: "problem", label: "Problem first", hint: "Name the annoyance, then the swap" },
  { id: "first-use", label: "First use", hint: "Opening it, not a brand film" },
  { id: "skeptic", label: "Skeptic", hint: "Almost didn't buy it" },
  { id: "routine", label: "In the routine", hint: "One step, not the whole life" },
  { id: "compare", label: "Vs the old way", hint: "What you stopped doing" },
] as const;

export const LANGUAGES = [
  { id: "en", label: "English", tts: "en" },
  { id: "es", label: "Spanish", tts: "es-MX" },
  { id: "hi", label: "Hindi", tts: "hi" },
  { id: "pt", label: "Portuguese", tts: "pt-BR" },
  { id: "fr", label: "French", tts: "fr" },
  { id: "de", label: "German", tts: "de" },
  { id: "ja", label: "Japanese", tts: "ja" },
  { id: "ar", label: "Arabic", tts: "ar-SA" },
] as const;

export const SPEEDS = [
  { id: 0.92, label: "Steady" },
  { id: 1, label: "Natural" },
  { id: 1.12, label: "Tight" },
] as const;

export const FORMATS: { id: FormatId; label: string; detail: string }[] = [
  { id: "talking", label: "Talking cut", detail: "Face holds the whole ad." },
  { id: "in-hand", label: "Product in frame", detail: "Your photo sits in the shot while they talk." },
  { id: "hook-broll", label: "Hook, then b-roll", detail: "Face for the open and the ask. Scene for the middle." },
];

export const ASPECTS: { id: AspectId; label: string }[] = [
  { id: "story", label: "9:16" },
  { id: "square", label: "1:1" },
  { id: "wide", label: "16:9" },
];

export const CAPTIONS: { id: CaptionStyle; label: string }[] = [
  { id: "punch", label: "Punch" },
  { id: "clean", label: "Clean" },
  { id: "lower", label: "Lower third" },
];

export const STRUCTURES = [
  {
    id: "callout",
    label: "Call-out",
    brief: "Open by naming a habit the viewer already has. Do not insult them. Then show the swap.",
  },
  {
    id: "confession",
    label: "Confession",
    brief: "First person, a specific moment, one sensory detail, then the product as the reason.",
  },
  {
    id: "rant",
    label: "Short rant",
    brief: "One myth, one correction, one proof detail. Fast, still kind, no fake outrage.",
  },
  {
    id: "grwm",
    label: "Get ready with me",
    brief: "Talk while doing a step. The product is one step, not the whole routine.",
  },
] as const;

export type Template = {
  id: string;
  niche: string;
  title: string;
  product: string;
  pitch: string;
  audience: string;
  offer: string;
  angle: string;
  creatorId: string;
  sceneId: string;
  format: FormatId;
  script: Script;
  productImage?: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "dew",
    niche: "Skincare",
    title: "Morning Dew Serum",
    product: "Morning Dew Serum",
    pitch: "A light serum for skin that feels tight after office air.",
    audience: "People filming a morning routine",
    offer: "A calmer feel by the end of the week",
    angle: "confession",
    creatorId: "maya",
    sceneId: "kitchen",
    format: "in-hand",
    productImage: "/samples/serum.jpg",
    script: {
      hook: "I stopped buying thick creams and my skin actually calmed down.",
      body: "This is Morning Dew. Two pumps, no film, and the tight feeling from the office air is gone by the time I finish coffee. I filmed this on day nine because the flaky patch by my nose finally eased up.",
      cta: "It's linked below if your skin is tired of being fussy.",
      altHooks: [
        "Office air was winning until I switched to two pumps of this.",
        "Day nine. The patch by my nose finally stopped complaining.",
      ],
    },
  },
  {
    id: "aisle",
    niche: "Grocery",
    title: "Weeknight dal mix",
    product: "Weeknight Dal",
    pitch: "A pouch of spices for dal that doesn't taste like a shortcut.",
    audience: "People who cook after work",
    offer: "Dinner in the time the rice takes",
    angle: "routine",
    creatorId: "priya",
    sceneId: "kitchen",
    format: "talking",
    script: {
      hook: "I am not pretending this is my grandmother's dal.",
      body: "It's a pouch. I still chop the onion, I still use the good ghee, and it tastes like I planned dinner instead of surviving it. Tuesday, twenty minutes, one pot.",
      cta: "If your weeknights need a pot and not a project, it's below.",
      altHooks: [
        "Tuesday dinner is one pot and I am not apologizing.",
        "The rice timer went off and dinner was actually done.",
      ],
    },
  },
  {
    id: "focus",
    niche: "Apps",
    title: "Northline focus app",
    product: "Northline",
    pitch: "A focus timer that blocks the two apps you actually open.",
    audience: "People who work from a laptop",
    offer: "One quiet hour without a second phone face-down",
    angle: "skeptic",
    creatorId: "kenji",
    sceneId: "desk",
    format: "hook-broll",
    script: {
      hook: "I have deleted four focus apps. This is the one still on the phone.",
      body: "Northline doesn't give me a garden or a streak lecture. It just asks which two apps to lock, then it locks them. I wrote this script inside the hour it bought me.",
      cta: "Try the lock. The link is under the video.",
      altHooks: [
        "No garden. No streak guilt. It just locks the apps.",
        "I wrote this during the hour Northline actually bought me.",
      ],
    },
  },
  {
    id: "tee",
    niche: "Apparel",
    title: "Heavyweight pocket tee",
    product: "Heavy Pocket Tee",
    pitch: "A thick cotton tee that doesn't twist after one wash.",
    audience: "People tired of tissue-thin basics",
    offer: "A shirt that still looks like itself next week",
    angle: "compare",
    creatorId: "jordan",
    sceneId: "street",
    format: "talking",
    script: {
      hook: "Most pocket tees feel like a receipt after the dryer.",
      body: "This one is heavy. The shoulder stayed put, the pocket didn't migrate, and I wore it twice before I washed it because it didn't collapse. That's the whole review.",
      cta: "Sizes are linked if you want a shirt that acts like fabric.",
      altHooks: [
        "I washed it. The pocket is still where they sewed it.",
        "If your tee twists in the dryer, this one's heavier.",
      ],
    },
  },
  {
    id: "walk",
    niche: "Habits",
    title: "Ten-minute walk plan",
    product: "Loop Walks",
    pitch: "A ten-minute walking plan for people who skip the gym.",
    audience: "Busy people who own sneakers",
    offer: "A plan short enough to do before you talk yourself out of it",
    angle: "problem",
    creatorId: "sofia",
    sceneId: "street",
    format: "hook-broll",
    script: {
      hook: "I do not need a new personality. I need ten minutes.",
      body: "Loop Walks is a plan, not a coach yelling. Shoes, outside, one loop around the block with a timer I don't have to build. I started because the gym membership was just guilt with a barcode.",
      cta: "Start with the short loop. Link's below.",
      altHooks: [
        "The gym membership was guilt with a barcode.",
        "Ten minutes, one block, no new personality required.",
      ],
    },
  },
  {
    id: "car",
    niche: "Supplements",
    title: "Afternoon magnesium",
    product: "Late Magnesium",
    pitch: "A small magnesium powder for the 3pm crash. Not a cure, a ritual.",
    audience: "People who crash after lunch",
    offer: "Something to drink instead of a third coffee",
    angle: "skeptic",
    creatorId: "noah",
    sceneId: "car",
    format: "talking",
    script: {
      hook: "I am not going to tell you a powder fixed my sleep.",
      body: "What it did was replace the third coffee. Late Magnesium, cold water, in the car before I drive back to the office. I still have afternoons. They are just less jagged.",
      cta: "If you want the less-coffee version, it's linked.",
      altHooks: [
        "This did not fix my sleep. It replaced a coffee.",
        "Third coffee was making the afternoon mean.",
      ],
    },
  },
];

export const SAMPLE_ID = "sample-glow";

export function getCreator(id: string): Creator {
  return CREATORS.find((c) => c.id === id) ?? CREATORS[0];
}

export function getScene(id: string): Scene {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

export function languageOf(id: string) {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

function uid() {
  return `cut_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function makeProject(over: Partial<AdProject> = {}): AdProject {
  const now = Date.now();
  return {
    id: over.id ?? uid(),
    title: over.title ?? "Untitled cut",
    product: over.product ?? "",
    pitch: over.pitch ?? "",
    audience: over.audience ?? "",
    offer: over.offer ?? "",
    angle: over.angle ?? "confession",
    language: over.language ?? "en",
    creatorId: over.creatorId ?? "maya",
    sceneId: over.sceneId ?? "kitchen",
    format: over.format ?? "talking",
    aspect: over.aspect ?? "story",
    captionStyle: over.captionStyle ?? "punch",
    speed: over.speed ?? 1,
    script: over.script ?? { hook: "", body: "", cta: "", altHooks: [] },
    productImage: over.productImage,
    cutVideo: over.cutVideo,
    cutKey: over.cutKey,
    createdAt: over.createdAt ?? now,
    updatedAt: now,
  };
}

export function sampleProject(): AdProject {
  const t = TEMPLATES[0];
  return makeProject({
    id: SAMPLE_ID,
    title: t.title,
    product: t.product,
    pitch: t.pitch,
    audience: t.audience,
    offer: t.offer,
    angle: t.angle,
    creatorId: t.creatorId,
    sceneId: t.sceneId,
    format: t.format,
    script: t.script,
    productImage: t.productImage,
    createdAt: 1,
  });
}

export function projectFromTemplate(t: Template): AdProject {
  return makeProject({
    title: t.title,
    product: t.product,
    pitch: t.pitch,
    audience: t.audience,
    offer: t.offer,
    angle: t.angle,
    creatorId: t.creatorId,
    sceneId: t.sceneId,
    format: t.format,
    script: { ...t.script, altHooks: [...t.script.altHooks] },
    productImage: t.productImage,
  });
}

export function starterScript(product: string, angle: string): Script {
  const name = product.trim() || "this";
  if (angle === "skeptic") {
    return {
      hook: `I almost didn't buy ${name}.`,
      body: `The page sounded like every other one. I tried it on a normal Tuesday anyway, not a photoshoot day, and the difference was small enough to trust. That's why I'm telling you.`,
      cta: `If you want the boring version of the result, it's linked.`,
      altHooks: [],
    };
  }
  if (angle === "problem") {
    return {
      hook: `The annoying part was never the price. It was the hassle.`,
      body: `${name} took that step out. I still do the rest myself. I just don't dread the part I used to skip.`,
      cta: `Look at it if that step is the one you keep avoiding.`,
      altHooks: [],
    };
  }
  return {
    hook: `I have been using ${name} long enough to have an opinion.`,
    body: `Not a launch-day opinion. A regular-week one. It fits where I already was, and I noticed when I forgot it. That's the bar.`,
    cta: `If you want to try the same setup, the link is below.`,
    altHooks: [],
  };
}

export function joinScript(script: Script) {
  return [script.hook, script.body, script.cta]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
